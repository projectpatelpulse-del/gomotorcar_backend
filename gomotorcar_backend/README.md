# GoMotorCar Backend

A Node.js / Express backend for the GoMotorCar application — provides APIs for authentication, profiles, bookings, payments, notifications and admin operations.

**Status:** Active development

**Quick links**
- Swagger UI: `/api/docs` (when server is running)
- OpenAPI JSON: `/api/docs.json`

**Prerequisites**
- Node.js 18+ (tested on Node 22)
- npm
- A running MongoDB instance (URI in `.env`)

**Install & run**
1. Clone the repo
   ```bash
   git clone <repo-url>
   cd gomotorcar_backend
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Create `.env` (see `ENV_VARS.md` for required variables)
4. Start in development (auto-reload)
   ```bash
   npm run dev
   ```
5. Start production
   ```bash
   npm start
   ```

**Project structure (important folders)**
- `index.js` — process entry (starts `server.js`)
- `server.js` — express app, middleware, route mounting, swagger docs
- `src/controllers` — request handlers
- `src/routes` — express routers (mount points defined in `server.js`)
- `src/models` — Mongoose models
- `src/middlewares` — custom middleware (auth, security, error handling)
- `src/utils` — helpers (logger, response handler, async wrapper)

**API docs**
- Open the running server at `http://localhost:5000/api/docs` to view auto-generated Swagger UI.

**How to contribute**
See `CONTRIBUTING.md` and `DEVELOPMENT.md` for guidelines and developer workflow.

---

If you need a quick walk-through or a hand writing tests or more detailed OpenAPI annotations for important endpoints, tell me which routes to prioritize and I will generate them.