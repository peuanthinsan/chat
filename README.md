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
- `STRIPE_SECRET_KEY` – Stripe secret key used to create checkout and portal sessions
- `STRIPE_PRICE_ID` – Stripe Price ID for the subscription plan
- `STRIPE_WEBHOOK_SECRET` – webhook signing secret for Stripe events
- `FRONTEND_URL` – optional override for checkout success/cancel URLs (defaults to the request origin)

### Stripe setup

Create a recurring price in your Stripe dashboard and configure the environment variables above.
Expose the webhook endpoint `https://<your-domain>/api/stripe/webhook` (or the local
equivalent when using the Stripe CLI) so that subscription events can update user records.

Users can start a subscription from the dashboard. Active subscribers can open the Stripe billing
portal to manage payment methods or cancel their plan.

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
