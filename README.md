# NEXUS
## AI-Powered Intelligent Monitoring and Recovery Platform

**Monitor Intelligently. Diagnose Automatically. Recover Reliably.**

NEXUS is an AI-powered application monitoring and recovery platform designed to detect application failures, analyse incidents using Google Gemini AI, and automatically recover failed services through Docker.

The platform combines real-time health monitoring, incident management, AI-based diagnosis, automated container recovery, and a web-based dashboard.

## Key Features

- **Application Monitoring:** Continuously monitors application health through scheduled health checks.
- **Incident Management:** Detects failures and automatically creates incident records.
- **AI-Powered Diagnosis:** Uses Google Gemini to analyse incidents and provide diagnostic reports.
- **Automated Recovery:** Restarts failed Docker containers using the recovery engine.
- **Recovery History:** Stores recovery attempts, results, and execution details.
- **Interactive Dashboard:** Provides a frontend to view application status, incidents, diagnosis, and recovery information.
- **Authentication:** Protects the dashboard using Nginx Basic Authentication.
- **Containerized Deployment:** Runs the frontend, backend, and demo application using Docker Compose.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| AI Diagnosis | Google Gemini API |
| Database | SQLite |
| Containerization | Docker |
| Orchestration | Docker Compose |
| Web Server | Nginx |
| CI/CD | GitHub Actions |
| External Access | Cloudflare Tunnel |

## System Architecture

NEXUS consists of three main Docker services:

1. **Demo Application:** A sample application monitored by the platform.
2. **Backend:** Handles health monitoring, incident management, Gemini diagnosis, database operations, and Docker-based recovery.
3. **Frontend:** Displays the monitoring dashboard and incident information through a React interface served by Nginx.

All services communicate through an internal Docker network.

The backend also connects to the Docker socket to perform authorized container recovery operations.

## How It Works

1. The monitoring service periodically checks the demo application's health.
2. If the application fails, NEXUS creates an incident.
3. The diagnosis service sends relevant incident information to Google Gemini.
4. Gemini analyses the failure and returns a diagnostic report.
5. The recovery service attempts to restart the affected Docker container.
6. NEXUS checks the application's health again.
7. The recovery result is stored in the database and displayed on the dashboard.

If Gemini is unavailable, the platform can use rule-based fallback diagnosis.

## Project Structure

```text
NEXUS/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── docker-build.yml
│
├── nexus-demo-app/
│   ├── app.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
│
├── nexus-frontend/
│   ├── public/
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
├── nexus-platform/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   └── incidents.py
│   │   └── services/
│   │       ├── diagnosis.py
│   │       ├── monitor.py
│   │       └── recovery.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Git
- Docker Desktop
- Docker Compose
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/a29493671-lang/NEXUS.git
cd NEXUS
```

### 2. Configure Environment Variables

Create the backend environment file at:

`nexus-platform/.env`

Add your Gemini API key using the environment variable name expected by the backend configuration.

Keep API keys and credentials private. Never commit `.env` or `.htpasswd` files.

### 3. Configure Dashboard Authentication

Create the authentication credentials file:

`nexus-frontend/.htpasswd`

Configure it with an appropriate username and securely generated password hash for Nginx Basic Authentication.

### 4. Start the Platform

```bash
docker compose up -d --build
```

### 5. Access the Dashboard

Open:

`http://localhost:5173`

The dashboard is protected by Basic Authentication.

Backend API:

`http://localhost:8001`

Demo application:

`http://localhost:8000`

### 6. Stop the Platform

```bash
docker compose down
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend health check |
| GET | `/api/status` | Platform status |
| GET | `/api/info` | Platform information |
| GET | `/api/incidents/` | List incidents |
| POST | `/api/incidents/check` | Run a monitoring check |
| GET | `/api/incidents/{id}/diagnosis` | Generate AI diagnosis |
| POST | `/api/incidents/{id}/recover` | Attempt incident recovery |
| GET | `/api/incidents/recovery-logs` | View recovery history |
| GET | `/api/incidents/demo-health` | Check demo application health |

## Monitoring and Recovery

The platform uses Docker health checks and application-level monitoring to detect failures.

When a failure is detected, the backend creates an incident, generates a diagnosis, and attempts the configured recovery action.

Recovery results are recorded so that users can review the outcome through the dashboard.

## Security

- Host services are bound to localhost using `127.0.0.1`.
- Dashboard access is protected using Nginx Basic Authentication.
- Environment variables and credentials are excluded from Git.
- Database files and runtime logs are excluded from Git.
- The backend uses Docker socket access for container recovery. This grants significant control over the Docker host and should be restricted appropriately.

## CI/CD

NEXUS includes GitHub Actions workflows:

- `ci.yml` — continuous integration checks.
- `docker-build.yml` — Docker build workflow.

These workflows help validate the repository and build container images.

## Future Enhancements

- Advanced anomaly detection.
- Monitoring multiple applications.
- Detailed performance metrics and analytics.
- Additional automated recovery strategies.
- Role-based access control.
- Production-grade deployment and security.

## Project Status

NEXUS is an actively developed demonstration project showcasing AI-assisted incident diagnosis, application monitoring, and Docker-based automated recovery.

**NEXUS — Monitor Intelligently. Diagnose Automatically. Recover Reliably.**