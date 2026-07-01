# Developer Setup

Follow these steps to get a local development environment running.

1. Prerequisites
   - Node.js (18+), npm
   - MongoDB (local or Atlas)

2. Clone repository

```bash
git clone <repo-url>
cd gomotorcar_backend
```

3. Install dependencies

```bash
npm install
```

4. Create `.env` (see `ENV_VARS.md`)

5. Start server (development)

```bash
npm run dev
```

6. Useful commands
- `npm start` — start production server
- `npm run dev` — start with `nodemon` auto-reload

7. Logs
- Application logs are written to `/logs` by `src/utils/logger.js` (daily file per date).

8. Common troubleshooting
- `EADDRINUSE`: change `PORT` in `.env` or kill the process using that port.
- MongoDB connection errors: verify `MONGO_URI` and network access.
