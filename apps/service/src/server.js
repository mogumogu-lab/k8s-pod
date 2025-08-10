import Fastify from 'fastify';

const app = Fastify();

// Root endpoint
app.get('/', async () => {
    return { message: 'Hello from Fastify on Kubernetes!' };
});

// Liveness: keep it cheap; do NOT call external deps here
app.get('/healthz', async () => {
    return { status: 'ok' };
});

// Readiness: include lightweight dependency checks with timeouts
app.get('/readyz', async () => {
    // e.g., ensure DB pool has at least 1 idle connection
    // e.g., ensure last successful ping within 5s, etc.
    return { status: 'ready' };
});

const port = process.env.PORT || 3000;

app.listen({ port, host: '0.0.0.0' })
    .then(() => console.log(`Server listening on ${port}`))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });