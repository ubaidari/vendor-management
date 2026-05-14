# Vendor Management (Expo + TypeScript)

Scalable Expo Router starter prepared for Admin and Vendor role-based portals.

## Folder structure

- `app` - routes and screens
- `components` - reusable UI components
- `constants` - theme and app constants
- `data` - static seed data and enums
- `hooks` - reusable custom hooks
- `services` - API/service layer

## Environment

- Copy `.env.example` to `.env` for the Expo app.
- Copy `backend/.env.example` to `backend/.env` for the API. Set `DATABASE_URL` from your Postgres provider (for example Neon). Never commit `.env` files; they stay listed in `.gitignore`. If a database password was shared or leaked, rotate it in the provider dashboard and update Render (or your host) environment variables.

## Run

1. `npm install`
2. `npm run start`
