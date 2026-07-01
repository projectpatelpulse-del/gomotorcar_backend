const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

function getMounts() {
  const serverFile = path.join(__dirname, '..', '..', 'server.js');
  const content = fs.readFileSync(serverFile, 'utf8');
  const regex = /app\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*require\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\)/g;
  const mounts = [];
  let m;
  while ((m = regex.exec(content)) !== null) {
    mounts.push({ mount: m[1], requirePath: m[2] });
  }
  return mounts;
}

function loadRouter(modulePath) {
  try {
    // resolve relative to project root
    const p = path.join(__dirname, '..', '..', modulePath);
    return require(p);
  } catch (e) {
    // ignore modules that can't be required
    return null;
  }
}

function extractPaths() {
  const mounts = getMounts();
  const paths = {};
  mounts.forEach(({ mount, requirePath }) => {
    const router = loadRouter(requirePath);
    if (!router || !router.stack) return;

    router.stack.forEach((layer) => {
      // layer.route is present for route handlers
      if (layer.route && layer.route.path) {
        const routePaths = Array.isArray(layer.route.path)
          ? layer.route.path
          : [layer.route.path];

        routePaths.forEach((rp) => {
          const fullPath = (mount === '/' ? '' : mount).replace(/\/$/, '') + (rp === '/' ? '' : rp);
          const methods = Object.keys(layer.route.methods || {}).map((m) => m.toLowerCase());
          if (!paths[fullPath]) paths[fullPath] = {};
          methods.forEach((m) => {
            paths[fullPath][m] = {
              tags: [mount],
              summary: `${m.toUpperCase()} ${fullPath}`,
              responses: {
                '200': { description: 'OK' },
              },
            };
          });
        });
      }

      // support for direct method layers (express 5 style)
      if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        layer.handle.stack.forEach((sublayer) => {
          if (sublayer.route && sublayer.route.path) {
            const rp = sublayer.route.path;
            const fullPath = (mount === '/' ? '' : mount).replace(/\/$/, '') + (rp === '/' ? '' : rp);
            const methods = Object.keys(sublayer.route.methods || {}).map((m) => m.toLowerCase());
            if (!paths[fullPath]) paths[fullPath] = {};
            methods.forEach((m) => {
              paths[fullPath][m] = {
                tags: [mount],
                summary: `${m.toUpperCase()} ${fullPath}`,
                responses: { '200': { description: 'OK' } },
              };
            });
          }
        });
      }
    });
  });
  return paths;
}

function generateSpec() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'GoMotorCar API',
      version: '1.0.0',
      description: 'Auto-generated API surface for quick review. Please expand operation details as needed.',
    },
    servers: [
      { url: process.env.BASE_URL || 'http://localhost:5000' }
    ],
    paths: extractPaths(),
  };
  return spec;
}

module.exports = (app) => {
  const spec = generateSpec();
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api/docs.json', (req, res) => res.json(spec));
};
