import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import summarize from './api/summarize.js';
import generate from './api/generate.js';

const apiHandlers = {
  '/api/summarize': summarize,
  '/api/generate': generate,
};

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa',
});

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const handler = apiHandlers[pathname];

  if (!handler) {
    vite.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
    return;
  }

  let rawBody = '';
  for await (const part of req) {
    rawBody += part;
    if (rawBody.length > 1_000_000) {
      res.statusCode = 413;
      res.end(JSON.stringify({ error: 'Request is too large.' }));
      return;
    }
  }

  try {
    req.body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Request body must be valid JSON.' }));
    return;
  }

  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  try {
    await handler(req, res);
  } catch (error) {
    console.error('Local API error:', error.message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'The local server had an unexpected error.' }));
    }
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, '127.0.0.1', () => {
  console.log(`Webscope is ready at http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  server.close();
  await vite.close();
  process.exit(0);
});
