import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { apiLimiter } from './middleware/rateLimit.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import sitesRoutes from './routes/sites.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';
import priceWatchesRoutes from './routes/priceWatches.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((x) => x.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origin not allowed by CORS.'), { status: 403 }));
  },
  credentials: false
}));
app.use(express.json({ limit: '300kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(apiLimiter);
app.use('/screenshots', express.static(path.resolve('screenshots'), { maxAge: '1h', fallthrough: true }));

app.get('/', (_req, res) => res.json({ success: true, data: { name: 'SitePilot API', status: 'online' } }));

app.get('/api/health', (_req, res) => res.json({
  success: true,
  data: {
    service: 'SitePilot API',
    status: 'ok',
    ollamaEnabled: String(process.env.OLLAMA_ENABLED).toLowerCase() === 'true',
    schedulerEnabled: String(process.env.ENABLE_SCHEDULER).toLowerCase() === 'true',
    emailAlertsEnabled: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    shoppingSearchEnabled: Boolean(process.env.SERPAPI_KEY),
    time: new Date().toISOString()
  }
}));

app.use('/api/sites', requireAuth, sitesRoutes);
app.use('/api/price-watches', requireAuth, priceWatchesRoutes);
app.use('/api', requireAuth, dashboardRoutes);
app.use('/api', requireAuth, reportsRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
