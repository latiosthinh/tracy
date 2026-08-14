import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import generateFlowRouter from './routes/generate-flow.js';
import autoSuiteRouter from './routes/auto-suite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/gemini', express.Router()); // mount shared prefix

// Re-route gemini sub-paths to their routers
app.use('/api/gemini/generate-flow', generateFlowRouter);
app.use('/api/gemini/auto-suite', autoSuiteRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In production, serve static files from dist-web
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../../../dist-web');
  app.use(express.static(staticPath));
}

app.listen(PORT, () => {
  console.log(`Tracy AI backend listening on http://localhost:${PORT}`);
});

export default app;
