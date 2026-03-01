# BudgetBolt ⚡

A powerful, self-hosted budgeting application built with FastAPI and React. Take full control of your finances with envelope-style budgeting, beautiful charts, AI-powered insights, and zero cloud dependencies.

## Features

- **Multi-Account Management** - Track checking, savings, credit cards, cash, and investment accounts
- **Envelope Budgeting** - YNAB-style zero-based budgeting with monthly category allocations
- **Transaction Tracking** - Add, edit, filter, and search transactions with full categorization
- **CSV Import** - Import bank statements with smart column mapping and preview
- **Interactive Reports** - Spending by category (pie chart), income vs expenses (bar chart), net worth (area chart), spending trends, and top payees
- **AI Insights** - Local LLM-powered analysis, forecasting, and budget advice via Ollama
- **Recurring Transactions** - Set up automatic bills, subscriptions, and income
- **Dashboard** - At-a-glance view of balances, budget progress, charts, and recent activity
- **Dark Mode** - Beautiful light and dark themes
- **Mobile Responsive** - Works great on phones, tablets, and desktops
- **Self-Hosted** - Your data stays on your server. One command to deploy.

## Quick Start with Docker

```bash
git clone https://github.com/aurablacklight/Codex-vibe-coding.git
cd Codex-vibe-coding
docker compose up -d
# Open http://localhost:5000
```

Create your account on first visit.

## Deploying to a Home Lab (GitHub Actions + Tailscale)

Automated deploys on every push to `main` via GitHub Actions and Tailscale SSH.

### One-time server setup

SSH into your server and run:

```bash
sudo bash deploy/setup-server.sh
```

This creates a `deploy` user, sets up `/opt/budgetbolt`, and verifies Docker + Tailscale.

### Tailscale OAuth setup

1. Go to [Tailscale Admin Console > Settings > OAuth Clients](https://login.tailscale.com/admin/settings/oauth)
2. Create a new OAuth client with the `devices:write` scope
3. Add an ACL tag: `tag:ci`
4. Make sure your ACLs allow `tag:ci` to SSH into your server (see below)

Add this to your Tailscale ACL policy (in `"acls"` section):

```json
{"action": "accept", "src": ["tag:ci"], "dst": ["sandbox.tail6a8276.ts.net:*"]}
```

And in the `"ssh"` section:

```json
{"action": "accept", "src": ["tag:ci"], "dst": ["tag:server"], "users": ["deploy"]}
```

### GitHub Secrets

Go to your repo's **Settings > Secrets and variables > Actions** and add:

| Secret | Value |
|--------|-------|
| `TS_OAUTH_CLIENT_ID` | OAuth client ID from the Tailscale admin console |
| `TS_OAUTH_SECRET` | OAuth client secret from the Tailscale admin console |

That's it. Push to `main` and it deploys automatically.

### How it works

```
Push to main
  -> GitHub Actions runner joins your tailnet
  -> SSHs into sandbox.tail6a8276.ts.net as deploy user
  -> git pull + docker compose up --build
  -> Health check verifies the app is live
  -> Done! App available at http://sandbox.tail6a8276.ts.net:5000
```

### Manual deploy

If you want to trigger a deploy without pushing code, go to **Actions > Deploy to Home Lab > Run workflow**.

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
PYTHONPATH=backend uvicorn app.main:app --reload --port 8000 --app-dir backend
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API calls to the backend.

### Seed Demo Data

```bash
cd backend
PYTHONPATH=. python -m app.seed
```

Creates a demo user (`demo` / `demo123`) with sample accounts, categories, and 3 months of transactions.

## AI Insights (Ollama)

BudgetBolt can use a local LLM via Ollama for financial analysis and forecasting.

```bash
# Install and start Ollama
ollama serve
ollama pull llama3.2

# That's it — BudgetBolt auto-detects it at localhost:11434
```

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama or any OpenAI-compatible endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Model to use for analysis |
| `AI_ENABLED` | `true` | Toggle AI features on/off |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Recharts |
| Database | SQLite (zero-config, file-based) |
| Auth | JWT (HMAC-SHA256) + PBKDF2 |
| AI | Ollama (OpenAI-compatible API) |
| Deploy | Docker, GitHub Actions, Tailscale SSH |

## API Documentation

When the backend is running, visit `http://localhost:8000/docs` for the interactive Swagger UI.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `change-me...` | JWT signing key (change in production!) |
| `DATABASE_URL` | `sqlite:///./data/budgetbolt.db` | Database connection |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT token expiry |
| `PORT` | `5000` | Server port |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | LLM endpoint |
| `OLLAMA_MODEL` | `llama3.2` | LLM model name |
| `AI_ENABLED` | `true` | Enable/disable AI features |

## Project Structure

```
backend/app/              - FastAPI backend (models, routers, schemas, services)
frontend/src/             - React frontend (pages, components, API client)
deploy/                   - Server setup scripts
.github/workflows/        - CI/CD pipeline (GitHub Actions + Tailscale)
Dockerfile                - Multi-stage build
docker-compose.yml        - One-command deploy
```

## License

MIT
