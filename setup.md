# Banking System: Complete Setup Guide

This guide is for someone setting up the project for the first time. Follow the sections in order. You do **not** need Python, Java, or Node.js installed on your computer for the default path: everything runs inside Docker.

---

## 1. What You Are Installing (Overview)

| Software | Why you need it | Required for |
|----------|------------------|--------------|
| **Git** | Clone the repository | Docker Compose and Kubernetes |
| **Docker Engine + Compose** | Runs databases, microservices, RabbitMQ, Prometheus, Grafana in containers | **Docker Compose path (recommended)** |
| **curl** (optional but useful) | Quick health checks from the terminal | Verification |
| **Minikube** | Local Kubernetes cluster | **Kubernetes path only** |
| **kubectl** | Talks to the Kubernetes cluster | **Kubernetes path only** |

**Inside Docker (you do not install these manually for Compose):**

- PostgreSQL 16 (three databases)
- MongoDB 7
- RabbitMQ 3.13
- Customer Service (Python 3.12 / FastAPI)
- Account Service (Java 21 / Spring Boot, built inside its image)
- Transaction Service (Node.js 20 / TypeScript)
- Notification Service (Python 3.12 / Flask)
- Prometheus and Grafana

---

## 2. Hardware and OS Expectations

- **RAM:** At least **8 GB** free for Docker (16 GB machine recommended).
- **Disk:** Several GB for images and volumes.
- **macOS:** Apple Silicon (M1/M2/M3) or Intel both work.
- **Windows:** **Windows 10/11 64-bit**, with WSL 2 enabled if you use Docker Desktop (Docker Desktop will guide you).

---

## 3. Install Git

### macOS

1. Install [Xcode Command Line Tools](https://developer.apple.com/download/all/) (includes Git), or use Homebrew:

```bash
xcode-select --install
```

If you use [Homebrew](https://brew.sh/):

```bash
brew install git
```

2. Confirm:

```bash
git --version
```

### Windows

1. Download Git for Windows: [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer. Keep the default options unless your organization specifies otherwise.
3. Open **Git Bash** or **PowerShell** and run:

```bash
git --version
```

---

## 4. Install Docker (Required for Local Run)

You need a running **Docker daemon** and the **Compose** command.

### macOS: Option A — Docker Desktop (simplest)

1. Download **Docker Desktop for Mac**: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Install and start Docker Desktop.
3. Wait until the whale icon shows **Docker is running**.
4. In **Settings → Resources**, give Docker at least **8 GB** memory if you can.
5. Verify:

```bash
docker version
docker compose version
```

### macOS: Option B — Colima (lightweight alternative)

If you use Colima instead of Docker Desktop:

1. Install Colima and Docker CLI (example with Homebrew):

```bash
brew install colima docker docker-compose
```

2. Start the VM (this starts the Docker daemon):

```bash
colima start
```

3. Confirm Docker sees the daemon:

```bash
docker info
```

If `docker info` fails, run `colima start` again and wait until it finishes.

### Windows: Docker Desktop

1. Enable **WSL 2** if the installer asks for it ([Microsoft WSL guide](https://learn.microsoft.com/en-us/windows/wsl/install)).
2. Download **Docker Desktop for Windows**: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
3. Install, reboot if prompted, then start Docker Desktop.
4. Use **Linux containers** mode (default).
5. In **Settings → Resources**, allocate at least **8 GB** RAM to Docker.
6. Open **PowerShell** or **Git Bash** and verify:

```bash
docker version
docker compose version
```

### docker-compose vs docker compose (important)

The helper scripts in this repo use the **`docker-compose`** command (with a hyphen).

- **Docker Desktop** often provides both `docker compose` and `docker-compose`. Check:

```bash
docker-compose version
```

- If **`docker-compose` is not found** on macOS:

```bash
brew install docker-compose
```

- If **`docker-compose` is not found** on Windows, install the standalone binary from the [Compose releases page](https://github.com/docker/compose/releases) and add it to your PATH, or use Docker Desktop’s latest version which typically registers `docker-compose`.

---

## 5. Clone the Repository

### macOS / Linux / Git Bash on Windows

```bash
cd ~/Documents
git clone <your-repository-url> banking-system
cd banking-system
```

Replace `<your-repository-url>` with your actual Git remote.

### Windows PowerShell

```powershell
cd $env:USERPROFILE\Documents
git clone <your-repository-url> banking-system
cd banking-system
```

---

## 6. End-to-End Setup with Docker Compose (Recommended)

This is the full local stack: four microservices, four databases, RabbitMQ, Prometheus, Grafana.

### 6.1 Make scripts executable (macOS / Linux / Git Bash)

```bash
chmod +x start.sh stop.sh
```

On Windows, run the same commands in **Git Bash**, or start the stack manually (next subsection).

### 6.2 Start everything

From the **repository root** (folder that contains `docker-compose.yml`):

```bash
./start.sh
```

What this does:

1. Checks that Docker is running.
2. Runs `docker-compose up -d --build` for all services.
3. Waits for health endpoints.
4. Runs **Alembic** migrations inside the Customer Service container.
5. Runs **Prisma** migrations inside the Transaction Service container.

The Account Service applies **Flyway** migrations automatically when the Spring Boot app starts.

### 6.3 If you cannot run shell scripts (Windows PowerShell)

Use Docker Compose directly from the repo root:

```bash
docker-compose -f docker-compose.yml up -d --build
```

Wait two to five minutes, then run migrations:

```bash
docker-compose exec -T customer-service alembic upgrade head
docker-compose exec -T transaction-service npx prisma migrate deploy
```

### 6.4 Verify the stack

Open a browser or use `curl`:

| Check | URL or command |
|-------|----------------|
| Customer API docs | [http://localhost:8001/docs](http://localhost:8001/docs) |
| Account API docs | [http://localhost:8002/swagger-ui.html](http://localhost:8002/swagger-ui.html) |
| Transaction API docs | [http://localhost:8003/api/docs/](http://localhost:8003/api/docs/) |
| Notification API docs | [http://localhost:8004/apidocs/](http://localhost:8004/apidocs/) |
| RabbitMQ UI | [http://localhost:15672](http://localhost:15672) (user `guest`, password `guest`) |
| Prometheus | [http://localhost:9090](http://localhost:9090) |
| Grafana | [http://localhost:3000](http://localhost:3000) (user `admin`, password `admin`) |

Quick terminal checks:

```bash
curl -s http://localhost:8001/health
curl -s http://localhost:8002/health
curl -s http://localhost:8003/health
curl -s http://localhost:8004/health
```

List containers:

```bash
docker-compose ps
```

### 6.5 Stop services (keeps your database data)

```bash
./stop.sh
```

Or:

```bash
docker-compose down
```

Volumes are **not** removed, so the next `start.sh` or `docker-compose up` keeps existing data.

### 6.6 Ports that must be free

If something else uses these ports, either stop that program or change ports in `docker-compose.yml`.

| Ports | Usage |
|-------|--------|
| 8001–8004 | Microservices |
| 5433–5435 | PostgreSQL (host mapping) |
| 27017 | MongoDB |
| 5672, 15672 | RabbitMQ |
| 9090 | Prometheus |
| 3000 | Grafana |

---

## 7. Optional: Kubernetes with Minikube

Use this when you need to demonstrate or test **Kubernetes** deployment. You still use Docker (Minikube runs cluster nodes in VMs or similar).

### 7.1 Install kubectl

**macOS (Homebrew):**

```bash
brew install kubectl
kubectl version --client
```

**Windows (Chocolatey, as Administrator):**

```powershell
choco install kubernetes-cli
kubectl version --client
```

**Windows (winget):**

```powershell
winget install Kubernetes.kubectl
```

### 7.2 Install Minikube

**macOS (Homebrew):**

```bash
brew install minikube
minikube version
```

**Windows (Chocolatey):**

```powershell
choco install minikube
```

**Windows (installer):** [https://minikube.sigs.k8s.io/docs/start/](https://minikube.sigs.k8s.io/docs/start/)

### 7.3 Start Minikube

The project expects enough CPU and memory for several databases and services:

```bash
minikube start --cpus=4 --memory=8192
```

If your machine cannot spare 8 GB for the VM, try `--memory=6144` and accept that startup may be slower or some pods may be tight on memory.

### 7.4 Deploy the banking system

The repository includes a script that builds images **inside Minikube’s Docker** and applies manifests.

**macOS / Git Bash:**

```bash
cd /path/to/banking-system
bash banking-infra/k8s/deploy-all.sh
```

**Windows note:** `deploy-all.sh` is a Bash script. Use **Git Bash**, or **WSL**, or run the `kubectl apply` and `docker build` commands from the script manually in a shell that supports Bash.

### 7.5 Access services on Minikube

After deployment, the script prints commands such as:

```bash
kubectl -n banking-system get pods
kubectl -n banking-system get svc
minikube service customer-service -n banking-system --url
```

RabbitMQ management UI is often reached with port-forward:

```bash
kubectl -n banking-system port-forward svc/rabbitmq 15672:15672
```

Then open [http://localhost:15672](http://localhost:15672).

---

## 8. Troubleshooting (Common Issues)

**Docker daemon not running**

- macOS Docker Desktop: open Docker Desktop and wait until it is idle.
- macOS Colima: run `colima start`, then `docker info`.

**`docker-compose`: command not found**

- Install standalone Compose (see section 4) or upgrade Docker Desktop.

**Port already in use**

- Find what is using the port and stop it, or edit `docker-compose.yml` to map different host ports.

**Customer Service errors about missing tables**

- Ensure you ran `./start.sh` (it runs Alembic) or manually:  
  `docker-compose exec -T customer-service alembic upgrade head`

**Transaction Service database errors**

- Run:  
  `docker-compose exec -T transaction-service npx prisma migrate deploy`

**Minikube image pull errors for locally built tags**

- The deploy script uses `eval "$(minikube docker-env)"` so images are built into Minikube’s Docker. Run `deploy-all.sh` from a shell where that `eval` succeeded.

**Windows line endings**

- If scripts fail with strange errors, ensure Git is set to check out Unix line endings for shell scripts, or re-save the file with LF endings.

---

## 9. Checklist: “Fully Set Up” with Docker Compose

Use this to confirm you are done.

- [ ] Git installed and repository cloned
- [ ] Docker running (`docker info` succeeds)
- [ ] `docker-compose version` succeeds
- [ ] From repo root: `./start.sh` completes without errors (or manual Compose + migration commands)
- [ ] All four `/health` URLs return success
- [ ] Swagger pages load for all four services (see section 6.4)
- [ ] Grafana loads at port 3000 with admin / admin

You do **not** need to install Python 3.12, Java 21, or Node 20 on the host for this path; they are provided inside the service images.

---

## 10. Where to Go Next

- **Architecture and APIs:** see the root `README.md`.
- **Assignment-style documentation:** see `docs/documentation.md`.
- **Demo flow:** see `docs/demo-video-script.md`.

If you only need a working system on your laptop, completing **sections 3 through 6** is enough.
