# Chat App

MVP full-stack application with React/Vite frontend and Express/MongoDB backend. Supports JWT authentication with refresh tokens, avatar uploads to Google Cloud Storage, and deployment to Google App Engine.

## Environment
Create `backend/.env` from the example:

```
cp backend/.env.example backend/.env
```

Set the following variables:

- `MONGO_URI` – connection string to external MongoDB (e.g., `mongodb://localhost:27017/chat`)
- `JWT_SECRET` – secret for access tokens
- `JWT_REFRESH` – secret for refresh tokens
- `GCS_BUCKET` – Google Cloud Storage bucket for avatars
- `STRIPE_SECRET_KEY` – Stripe secret key used by the backend API
- `STRIPE_PRICE_ID` – ID of the recurring price to sell via subscriptions
- `STRIPE_WEBHOOK_SECRET` – signing secret for the Stripe webhook endpoint (recommended)
- `CLIENT_URL` – optional base URL for redirecting after checkout (falls back to request origin)

For the frontend, create `frontend/.env` and expose your publishable key:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_1234
```

### Stripe Webhooks

When running locally, forward Stripe webhooks to the development server so subscription updates
are reflected in MongoDB:

```
stripe listen --forward-to localhost:8080/api/subscriptions/webhook
```

Copy the webhook signing secret from the command output into `STRIPE_WEBHOOK_SECRET`.

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
