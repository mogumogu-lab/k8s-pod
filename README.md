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
# deployment
## Preview final manifests (see what will be applied)
kubectl kustomize k8s/overlays/dev | less

## Apply all (Namespace + resources via overlay)
kubectl apply -k k8s/overlays/dev



# Basic
## List namespaces
kubectl get ns

## List everything in a namespace
kubectl get all -n app-dev

## Narrow down
kubectl get deploy,svc,cm,po -n app-dev
kubectl get po -l app.kubernetes.io/name=service1 -n app-dev  # by label


# Details
## Describe a Deployment or Pod
kubectl describe deploy/service1 -n app-dev
kubectl describe po/<pod-name> -n app-dev

## Recent events in the namespace (very useful for failures)
kubectl get events -n app-dev --sort-by=.lastTimestamp



# Logs
## Logs from a Deployment (kubectl can resolve to pods)
kubectl logs deploy/service1 -n app-dev --tail=100 -f

## Or pick a specific pod
kubectl logs <pod-name> -n app-dev -f

## If multiple containers
kubectl logs <pod-name> -c app -n app-dev -f 



# Execution
## Exec into a pod (interactive shell)
kubectl exec -it <pod-name> -n app-dev -- /bin/sh

## Check environment vars
kubectl exec <pod-name> -n app-dev -- env | grep PORT

## Port-forward service (local 8080 -> service port 80)
kubectl port-forward svc/service1 8080:80 -n app-dev

# Rollout / Scale / Image
## Rollout status (wait until ready)
kubectl rollout status deploy/service1 -n app-dev

## Restart a deployment (triggers rolling update)
kubectl rollout restart deploy/service1 -n app-dev

## Scale replicas
kubectl scale deploy/service1 -n app-dev --replicas=2

## Set new image (quick test; CI/CD에선 Kustomize images 권장)
kubectl set image deploy/service1 app=mogumogusityau/service1:1.0.1 -n app-dev



# Resource / Debug
## Needs metrics-server
kubectl top pod -n app-dev

## Ephemeral debug container (when base image lacks tools)
kubectl debug po/<pod-name> -n app-dev --image=busybox -it --target=app
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