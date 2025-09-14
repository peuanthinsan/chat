# Chat App

MVP full-stack application with React/Vite frontend and Express/MongoDB backend. Supports JWT authentication with refresh tokens, avatar uploads to Google Cloud Storage, and deployment to Google App Engine.

## Environment
Create `backend/.env` from the example:

```
cp backend/.env.example backend/.env
```

Set the following variables:

- `MONGO_URI` – connection string to external MongoDB
- `JWT_SECRET` – secret for access tokens
- `JWT_REFRESH` – secret for refresh tokens
- `GCS_BUCKET` – Google Cloud Storage bucket for avatars

## Development

```
cd frontend && npm install && npm run dev
cd ../backend && npm install && npm run dev
```

The Vite dev server proxies API requests to the backend.

## Docker

Build and run the container locally:

```
docker build -t chat-app .
docker run -p 8080:8080 --env-file backend/.env chat-app
```

## Deployment

This repo includes `app.yaml` and a GitHub Actions workflow for deploying to Google App Engine. Configure `GCP_PROJECT`, `GCP_SA_KEY`, and `GCP_REGION` secrets in your repository, then push to the `main` branch to trigger deployment.
