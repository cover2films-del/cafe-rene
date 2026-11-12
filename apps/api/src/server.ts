import { refreshContent } from './content-refresh.ts';
import { existsSync } from 'node:fs';
import express from 'express';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { openDB } from './db.ts';
import { seed } from './seed.ts';
import { Service } from './service.ts';
import { createApp } from './app.ts';
if (existsSync('../../.env')) process.loadEnvFile('../../.env');
const db = await openDB(resolve(process.env.DATA_DIR || '../../work/database'));
await seed(db);
const s = new Service(db, {
  mode: process.env.APP_MODE || 'demo',
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  webhookSecret: process.env.MOCK_WEBHOOK_SECRET || randomBytes(32).toString('hex'),
});
const app = createApp(s);
if (process.env.SERVE_WEB === 'true') {
  const web = resolve('../web/dist');
  app.use(express.static(web));
  app.get('/{*path}', (req, res) => {
    if (req.path.startsWith('/api/')) res.status(404).json({ error: 'Endpoint not found' });
    else res.sendFile(resolve(web, 'index.html'));
  });
}
const server = app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () =>
  console.log('René demo API listening on :3001 — mock payments / mock POS'),
);
const contentTimer = setInterval(() => {
  void refreshContent(db).catch(() => console.error('Content refresh deferred'));
}, 60000);
const firstContent = setTimeout(() => {
  void refreshContent(db).catch(() => console.error('Content refresh deferred'));
}, 1500);
const timer = setInterval(() => s.runJobs().catch(() => console.error('Job retry deferred')), 3000);
process.on('SIGTERM', () => {
  clearInterval(timer);
  clearInterval(contentTimer);
  clearTimeout(firstContent);
  server.close(() => db.close());
});
