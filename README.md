# Minikube Basics

This page covers Deployments and Services (ClusterIP), including configuration of readiness/liveness probes and resource requests/limits.

## Installation

### Prerequisites

You should use Linux and Docker has to be installed.

### Install Kubectl

Run the following commands:

```sh
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl-convert"
sudo install -o root -g root -m 0755 kubectl-convert /usr/local/bin/kubectl-convert
kubectl version --client
```

Detail is [here](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/).

### Install Minikube

Run the following commands:

```sh
curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube 
```

Detail is [here](https://minikube.sigs.k8s.io/docs/start/?arch=%2Flinux%2Fx86-64%2Fstable%2Fbinary+download).

### Build App

```sh
docker login
docker build -t mogumogusityau/service:v1.0.0 .
docker push mogumogusityau/service:v1.0.0
```



## Minikube Commands

```sh
minikube start --driver=docker --nodes=2
minikube status
```


## Kubectl Commands

```bash
# 0) Create namespace first
kubectl apply -f k8s/namespace.yaml

# 1) Apply Pod and Service
kubectl apply -f k8s/pod.yaml
kubectl apply -f k8s/service.yaml

# 2) List resources in 'test' namespace
kubectl get pod,svc -n test

# 3) Describe Pod/Service to verify specs and events
kubectl describe pod pod -n test
kubectl describe svc test-svc -n test

# 4) Check endpoints via EndpointSlice (no deprecation warning)
kubectl get endpointslice -n test -l app.kubernetes.io/name=test-svc
# (or, legacy)
kubectl get endpoints -n test test-svc

# 5) Port-forward Service and hit health endpoints
kubectl port-forward -n test svc/test-svc 3000:3000

# In another shell:
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz

# 6) Logs & Exec into the Pod
kubectl logs -f pod -n test
kubectl exec -it pod -n test -- sh
```



## Criteria for Resource Requests and Limits in Kubernetes Deployment

### 1. Small-Scale Applications (e.g., Simple Web Server, Testing Environment)

- requests.cpu: 100m
- requests.memory: 128Mi
- limits.cpu: 300m
- limits.memory: 256Mi

This configuration is suitable for simple web servers or small-scale testing applications. It's ideal for applications with low resource usage, and for processes that do not consume significant resources. This amount should be sufficient for such use cases.

### 2. Medium-Scale Applications (e.g., General Business Applications, API Servers)

- requests.cpu: 200m
- requests.memory: 256Mi
- limits.cpu: 500m
- limits.memory: 512Mi

For medium-scale applications, a moderate performance demand is required, so the requests value should be increased. Setting limits ensures the application efficiently utilizes resources. This configuration works well for use cases such as API servers or database-driven applications.

### 3. Large-Scale Applications (e.g., Large-Scale Web Applications, Backend Services, Data Processing)

- requests.cpu: 500m
- requests.memory: 512Mi
- limits.cpu: 1 CPU
- limits.memory: 1Gi

Large-scale applications tend to consume significant resources, so requests and limits must be set higher. This setting is appropriate for applications handling high user traffic, large backend services, or data pipeline processing. It ensures that the application can run reliably and with the necessary performance.

### 4. High-Resource Usage Applications (e.g., Machine Learning, Data Analysis, Advanced Processing Systems)

- requests.cpu: 1 CPU
- requests.memory: 2Gi
- limits.cpu: 2 CPU
- limits.memory: 4Gi

Applications that require high resource usage need higher CPU and memory resources. Examples include machine learning training, big data processing, or advanced data analysis systems. These applications consume significant resources, so it’s important to set resource limits and manage them effectively.