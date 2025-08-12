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



## Open cluster

### Run Minikube

```sh
minikube start --driver=docker
```

### Add addons on Minikube

```sh
minikube addons enable metrics-server
```

### Check if cluster is running

```sh
kubectl get nodes
```



## Run Cluster

### Run Namespace

```sh
kubectl apply -f k8s/namespace.yml
```

### Run Deployment

```sh
kubectl apply -f k8s/deployment.yml
```

### Run Service

```sh
kubectl apply -f k8s/service.yaml
```



## Check Cluster

### Check Namespace

```sh
kubectl get namespaces
```

### Check Pods

```sh
kubectl get pods -n test
```

### Check Services

```sh
kubectl get services -n test
```

### Check Deployments

```sh
kubectl get deployments -n test
```


## Result

Because replicas are set to 2, two pods are created. The service is set to NodePort, so it can be accessed from outside the cluster.

```sh
mogumogu@mogumogu~/Downloads$ kubectl get pods -n test
NAME                           READY   STATUS    RESTARTS   AGE
test-deploy-67fb448ff4-prvq7   1/1     Running   0          127m
test-deploy-67fb448ff4-t57cj   1/1     Running   0          127m
mogumogu@mogumogu:~/Downloads$ kubectl get services -n test
NAME       TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
test-svc   NodePort   10.100.132.44   <none>        80:30080/TCP   127m
mogumogu@mogumogu:~/Downloads$ kubectl get deployments -n test
NAME          READY   UP-TO-DATE   AVAILABLE   AGE
test-deploy   2/2     2            2           127m
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