# ETU Diagnostic Laboratory

The platform currently includes secure authentication, user administration, stock management, and the administrator dashboard.

## Project structure

- `backend/` — Express and MongoDB API
- `frontend/` — React and Vite web application

## Setup

1. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`, `JWT_SECRET`, and the first administrator credentials.
2. Run `npm install` from the repository root.
3. Run `npm run seed:admin` once to create the initial administrator and stock categories.
4. Run `npm run dev` and open the frontend address shown in the terminal.

The API is served under `/api`.
