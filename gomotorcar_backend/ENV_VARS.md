# Environment Variables

Store project secrets and environment configuration in a `.env` file at the project root. Add this file to `.gitignore` and never commit secrets.

Recommended variables (adjust names if your code differs):

- `NODE_ENV` — `development` | `production` (default: development)
- `PORT` — port to run the server (default: `5000`)
- `BASE_URL` — public base URL used in OpenAPI servers (e.g. `https://api.gomotorcar.com`)
- `MONGO_URI` — MongoDB connection string
- `JWT_ACCESS_SECRET` — JWT secret for access tokens
- `JWT_REFRESH_SECRET` — JWT secret for refresh tokens
- `JWT_ACCESS_EXPIRES` — optional expiry (e.g. `15m`)
- `JWT_REFRESH_EXPIRES` — optional expiry (e.g. `7d`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — if using email

Example `.env` (do NOT commit):

```
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/dbname
JWT_ACCESS_SECRET=supersecretaccess
JWT_REFRESH_SECRET=supersecretrefresh
```

If additional env keys are required by your deployment (payment provider keys, third-party API keys), list them here and store securely in the target environment.
