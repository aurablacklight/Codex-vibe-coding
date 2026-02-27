# BudgetBolt ⚡

A powerful, self-hosted budgeting application built with FastAPI and React. Take full control of your finances with envelope-style budgeting, beautiful charts, and zero cloud dependencies.

## Features

- **Multi-Account Management** - Track checking, savings, credit cards, cash, and investment accounts
- **Envelope Budgeting** - YNAB-style zero-based budgeting with monthly category allocations
- **Transaction Tracking** - Add, edit, filter, and search transactions with full categorization
- **CSV Import** - Import bank statements with smart column mapping and preview
- **Interactive Reports** - Spending by category (pie chart), income vs expenses (bar chart), net worth (area chart), spending trends, and top payees
- **Recurring Transactions** - Set up automatic bills, subscriptions, and income
- **Dashboard** - At-a-glance view of balances, budget progress, charts, and recent activity
- **Dark Mode** - Beautiful light and dark themes
- **Mobile Responsive** - Works great on phones, tablets, and desktops
- **Self-Hosted** - Your data stays on your server. One command to deploy.

## Quick Start with Docker

```bash
git clone https://github.com/aurablacklight/Codex-vibe-coding.git
cd Codex-vibe-coding
docker-compose up -d
# Open http://localhost:5000
```

Create your account on first visit.

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

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Recharts |
| Database | SQLite (zero-config, file-based) |
| Auth | JWT (python-jose) + bcrypt |
| Deployment | Docker, docker-compose |

## API Documentation

When the backend is running, visit `http://localhost:8000/docs` for the interactive Swagger UI.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `change-me...` | JWT signing key |
| `DATABASE_URL` | `sqlite:///./data/budgetbolt.db` | Database connection |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT token expiry |
| `PORT` | `5000` | Server port |

## Project Structure

```
backend/app/          - FastAPI backend (models, routers, schemas, services)
frontend/src/         - React frontend (pages, components, API client)
Dockerfile            - Multi-stage build
docker-compose.yml    - One-command deploy
```

## License

MIT
