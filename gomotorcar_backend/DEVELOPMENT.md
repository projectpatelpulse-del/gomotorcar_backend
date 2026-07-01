# Development Guide

This guide explains the project's conventions and how to add new features.

1. Adding a new resource (e.g., `widget`)

- Model: `src/models/widget.model.js` — define Mongoose schema and export model.
- Controller: `src/controllers/widget.controller.js` — implement async handlers and use `asyncHandler` to wrap exported functions.
- Routes: `src/routes/widget.routes.js` — create an Express `Router`, register routes and export the router. Example:

```js
const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widget.controller');

router.get('/', widgetController.listWidgets);
router.post('/', widgetController.createWidget);

module.exports = router;
```

- Mount point: add to `server.js`:

```js
app.use('/api/widgets', require('./src/routes/widget.routes'));
```

2. Controllers
- Use `src/utils/asyncHandler.js` to avoid try/catch in every controller.
- Use `src/utils/responseHandler.js` methods (`successResponse`, `errorResponse`, `createdResponse`) for consistent API responses.

3. Middlewares
- Put shared middleware in `src/middlewares` and export them from `server.js` where appropriate.

4. Error handling
- Throw errors or call `next(err)` in controllers. Global handler `src/middlewares/errorHandler.js` formats responses.

5. Logging
- Use `src/utils/logger.js` for logs instead of console.* directly.

6. Linting and tests
- No linter/tests configured by default. Add `eslint` / test framework of choice and update `package.json` scripts.

7. Database migrations
- Project does not include migration tooling. For schema evolution consider `migrate-mongo` or another tool if required.

8. API docs
- A basic auto-generated Swagger UI is available at `/api/docs`. For production-ready docs, expand `src/docs/swagger.js` or maintain an explicit `openapi.yaml`.

9. Pull request checklist
- Run the app locally and test new endpoints
- Add/modify models with care (backwards-incompatible changes may break existing data)
- Add minimal docs in `DEVELOPMENT.md` when changing patterns
