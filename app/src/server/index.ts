import { createServer } from 'node:http';
import { createRequestHandler } from './app.js';
import { initializeSchema } from './db/schema.js';

const PORT = Number(process.env.PORT) || 9531;
const HOST = process.env.HOST || '0.0.0.0';

initializeSchema();

createServer(createRequestHandler()).listen(PORT, HOST, () => {
  console.log(`[huahua-design] canvas on http://${HOST}:${PORT}`);
});
