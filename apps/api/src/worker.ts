// The embedded demo runs jobs in the API process. External PostgreSQL deployments can run this worker.
import { openDB } from './db.ts';
import { Service } from './service.ts';
if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || !process.env.MOCK_WEBHOOK_SECRET)
  throw Error(
    'Worker requires DATABASE_URL and shared secrets. Do not open one PGlite directory from two processes.',
  );
const db = await openDB();
const s = new Service(db, {
  secret: process.env.SESSION_SECRET,
  webhookSecret: process.env.MOCK_WEBHOOK_SECRET,
  mode: process.env.APP_MODE,
});
setInterval(() => s.runJobs().catch(() => console.error('Worker retry deferred')), 3000);
