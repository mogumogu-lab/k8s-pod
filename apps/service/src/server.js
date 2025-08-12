import crypto from 'crypto';
import 'dotenv/config';
import Fastify from 'fastify';
import fs from 'fs';
import os from 'os';
import path from 'path';
import client from 'prom-client';

const fastify = Fastify({ logger: true });

// ===== Env & flags =====
const PORT = parseInt(process.env.PORT || '3000', 10);
const MODE = process.env.MODE || 'web';
const APP_VERSION = process.env.APP_VERSION || 'v1';
const DATA_DIR = process.env.DATA_DIR || '/data';
const STARTUP_DELAY_MS = parseInt(process.env.STARTUP_DELAY_MS || '0', 10);
const GRACEFUL_MS = parseInt(process.env.GRACEFUL_MS || '0', 10);
const JOB_FAIL_RATE = Number(process.env.JOB_FAIL_RATE || '0');
const NODE_NAME = process.env.NODE_NAME || process.env.K8S_NODE_NAME || ''; 

// readiness/health toggles
let healthy = true;
let ready = STARTUP_DELAY_MS === 0;

// optional background load loop
let loadTimer = null;

// ===== Prometheus metrics =====
client.collectDefaultMetrics(); // process_cpu_seconds_total, nodejs_eventloop_lag_seconds, etc.

const reqHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['route', 'method', 'code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

fastify.addHook('onResponse', async (request, reply) => {
  const route = request.routerPath || request.url.split('?')[0] || 'unknown';
  reqHistogram.labels(route, request.method, String(reply.statusCode)).observe(reply.getResponseTime() / 1000);
});

// ===== Helpers =====
function busyCpu(ms) {
  const end = Date.now() + ms;
  // simple CPU burn; uses math to avoid being optimized away
  while (Date.now() < end) {
    Math.sqrt(Math.random() * Math.random());
  }
}

function allocMem(mb) {
  // allocate a buffer and retain it in closure if leak=1
  return Buffer.alloc(mb * 1024 * 1024, 1);
}

// ===== Routes =====
fastify.get('/healthz', async (req, reply) => {
  if (req.query.fail !== undefined) healthy = false;
  if (!healthy) return reply.code(500).send({ ok: false });
  return reply.send({ ok: true });
});

fastify.get('/readyz', async (req, reply) => {
  if (req.query.ready !== undefined) ready = req.query.ready === '1';
  if (!ready) return reply.code(503).send({ ok: false });
  return reply.send({ ok: true });
});

fastify.get('/version', async (_, reply) => {
  reply.send({ version: APP_VERSION });
});

fastify.get('/id', async (_, reply) => {
  reply.send({
    hostname: os.hostname(),
    nodeName: NODE_NAME,
    podIp: (fastify.server.address()?.address) || '',
    version: APP_VERSION
  });
});

fastify.get('/headers', async (req, reply) => {
  reply.send({ headers: req.headers });
});

// Fault/latency injection
fastify.get('/sleep', async (req, reply) => {
  const ms = parseInt(req.query.ms || '1000', 10);
  await new Promise(r => setTimeout(r, ms));
  reply.send({ sleptMs: ms });
});

fastify.get('/status', async (req, reply) => {
  const code = parseInt(req.query.code || '500', 10);
  reply.code(code).send({ forced: true, code });
});

// CPU & memory
fastify.get('/cpu', async (req, reply) => {
  const ms = parseInt(req.query.ms || '1000', 10);
  busyCpu(ms);
  reply.send({ burnedMs: ms });
});

let retained = []; // keep leaked buffers here
fastify.get('/alloc', async (req, reply) => {
  const mb = parseInt(req.query.mb || '100', 10);
  const ms = parseInt(req.query.ms || '10000', 10);
  const leak = req.query.leak ? req.query.leak === '1' : false;

  const buf = allocMem(mb);
  if (leak) {
    retained.push(buf);
  } else {
    setTimeout(() => { buf.fill(0); /* allow GC */ }, ms);
  }
  await new Promise(r => setTimeout(r, Math.min(ms, 200))); // small wait
  reply.send({ allocatedMB: mb, holdMs: ms, leak });
});

// Simple stateful write
fastify.post('/data', async (req, reply) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, `${os.hostname()}.log`);
  const line = JSON.stringify({ ts: new Date().toISOString(), body: req.body }) + '\n';
  fs.appendFileSync(file, line);
  reply.send({ written: true, file });
});

fastify.get('/data', async (_, reply) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, `${os.hostname()}.log`);
  const exists = fs.existsSync(file);
  reply.send({ exists, file, size: exists ? fs.statSync(file).size : 0 });
});

// Background load controls (no external generator needed)
fastify.post('/load/start', async (req, reply) => {
  const cpuMs = parseInt((req.query.cpuMs || req.body?.cpuMs || 50), 10);
  const intervalMs = parseInt((req.query.intervalMs || req.body?.intervalMs || 100), 10);
  if (loadTimer) clearInterval(loadTimer);
  loadTimer = setInterval(() => busyCpu(cpuMs), intervalMs);
  reply.send({ load: 'started', cpuMs, intervalMs });
});

fastify.post('/load/stop', async (_, reply) => {
  if (loadTimer) clearInterval(loadTimer);
  loadTimer = null;
  reply.send({ load: 'stopped' });
});

// Prometheus metrics
fastify.get('/metrics', async (_, reply) => {
  reply.header('Content-Type', client.register.contentType);
  reply.send(await client.register.metrics());
});

// ===== Modes: job / agent / web =====
async function runJobAndExit() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, 'job.log');
    const payload = {
      ts: new Date().toISOString(),
      host: os.hostname(),
      nonce: crypto.randomBytes(8).toString('hex')
    };
    fs.appendFileSync(file, JSON.stringify(payload) + '\n');

    const fail = Math.random() < JOB_FAIL_RATE;
    fastify.log.info({ mode: 'job', fail }, 'Job finished');
    if (fail) process.exit(1);
    process.exit(0);
  } catch (e) {
    fastify.log.error(e, 'Job error');
    process.exit(1);
  }
}

function runAgent() {
  setInterval(() => {
    fastify.log.info({ ts: new Date().toISOString(), host: os.hostname(), nodeName: NODE_NAME }, 'agent heartbeat');
  }, 10_000);
}

// ===== Startup & shutdown =====
async function start() {
  if (STARTUP_DELAY_MS > 0) {
    ready = false;
    setTimeout(() => { ready = true; }, STARTUP_DELAY_MS);
  }

  if (MODE === 'job') {
    // no server needed; run once and exit
    await runJobAndExit();
    return;
  }

  if (MODE === 'agent') {
    runAgent();
  }

  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  fastify.log.info({ port: PORT, mode: MODE, version: APP_VERSION }, 'Server started');
}

async function shutdown(signal) {
  try {
    fastify.log.info({ signal, waitMs: GRACEFUL_MS }, 'Graceful shutdown starting');
    if (GRACEFUL_MS > 0) await new Promise(r => setTimeout(r, GRACEFUL_MS));
    if (loadTimer) clearInterval(loadTimer);
    await fastify.close();
    process.exit(0);
  } catch (e) {
    fastify.log.error(e, 'Shutdown error');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch(err => {
  fastify.log.error(err, 'Fatal start error');
  process.exit(1);
});
