import cors from 'cors';
import express from 'express';
// Optional security middleware (loaded at runtime if installed)
import path from 'path';
import config from './config';

// Import routes
import activityRoutes from './routes/activity.routes';
import activityTypeRoutes from './routes/activityType.routes';
import authRoutes from './routes/auth.routes';
import competencyRoutes from './routes/competency.routes';
import dashboardRoutes from './routes/dashboard.routes';
import eventRoutes from './routes/event.routes';
import recognizedCourseRoutes from './routes/recognizedCourse.routes';
import uploadRoutes from './routes/upload.routes';
import userRoutes from './routes/user.routes';
import activityLogRoutes from './routes/activityLog.routes';
import { logActivity } from './utils/logger';

const app = express();

// Load optional security middleware if available to avoid hard dependency
let _helmet: any = null;
let _rateLimit: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _helmet = require('helmet');
} catch (e) {
  console.warn('Optional dependency "helmet" not installed. Skipping helmet.');
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _rateLimit = require('express-rate-limit');
} catch (e) {
  console.warn('Optional dependency "express-rate-limit" not installed. Skipping rate limiting.');
}

if (_helmet) app.use(_helmet());
if (_rateLimit) {
  const limiter = _rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);
}

// =============================
// Middleware
// =============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================
// 1️⃣ PUBLIC UPLOADS
// =============================
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// =============================
// 2️⃣ BLOCK FOLDER SENSITIF
// =============================

const BLOCKED = [
  "/src",
  "/routes",
  "/controllers",
  "/middleware",
  "/prisma",
  "/config",
  "/node_modules",
  "/dist"
];

app.use((req, res, next) => {
  for (const dir of BLOCKED) {
    if (req.path.startsWith(dir)) {
      res.status(403).json({ message: "Access to this directory is forbidden" });
      return;
    }
  }
  next();
});

// =============================
// 3️⃣ BLOCK FILE TYPE SENSITIF
// =============================
app.use((req, res, next) => {
  if (
    req.path.endsWith(".ts") ||
    req.path.endsWith(".js") ||
    req.path.endsWith(".map")
  ) {
    res.status(403).json({ message: "Direct file access forbidden" });
    return;
  }
  next();
});

// =============================
// Routes
// =============================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/activity-types', activityTypeRoutes);
app.use('/api/competencies', competencyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/recognized-courses', recognizedCourseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to TIFPoint API' });
});

// Temporary test route to validate server-side logging
app.get('/__test-log', async (req, res) => {
  try {
    await logActivity(null, 'TEST_ROUTE', 'Test route called', req as any);
    res.json({ message: 'Logged' });
  } catch (e) {
    res.status(500).json({ message: 'Error logging' });
  }
});

// =============================
// 404 HANDLER
// =============================
app.use((req, res) => {
  res.status(404).json({
    message: "Halaman tidak ditemukan"
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Optional: run migrations on startup if enabled
  if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
    // Run in background, do not block startup
    const { exec } = require('child_process');
    console.log('RUN_MIGRATIONS_ON_START is true, attempting to run migrations...');
    exec('npx prisma migrate deploy', (err: any, stdout: string, stderr: string) => {
      if (err) {
        console.error('Error running migrations:', err);
        return;
      }
      console.log('Migration output:', stdout || stderr);
    });
  }
});
