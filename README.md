# Bon-Bon — Railway single-service deployment

This repository root is the **whole project**. Deploy this root with Railway's Dockerfile builder.

## Structure
- `Dockerfile` — builds React and runs Django + Nginx in one service
- `backend/` — Django API, auth, sessions and database models
- `frontend/react/` — React application
- `railway/` — Nginx and startup configuration
- `railway.toml` — Railway deployment configuration

## Railway
1. Deploy the repository **root** (do not deploy only `frontend/react`).
2. For data that survives redeploys, add a Railway Volume to this service and mount it at `/data`, or set `DATABASE_URL` to a Railway PostgreSQL database.
3. Set `SECRET_KEY` to a long random value and keep it unchanged between deploys.
4. Open `/health` after deployment.

Without a Railway Volume or PostgreSQL database, Railway uses temporary SQLite storage under `/tmp/instakids-data`; accounts, posts, messages, and media can be lost when the container is replaced. Sessions last 30 days and renew with activity, but the session and app data still require a persistent backend database to survive a deployment.

Do not commit `backend/db.sqlite3`; production data belongs in the Railway Volume or PostgreSQL.
