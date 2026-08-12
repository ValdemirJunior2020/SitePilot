import 'dotenv/config';
import app from './app.js';
import { startScheduler } from './services/scheduler.js';

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`SitePilot API listening on http://0.0.0.0:${port}`);
  startScheduler();
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
