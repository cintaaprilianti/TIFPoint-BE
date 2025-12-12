import cors from 'cors';
import express from 'express';
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

const app = express();

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

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to TIFPoint API' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
