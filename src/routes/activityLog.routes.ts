import express from 'express';
import { getActivityLogs } from '../controllers/activityLog.controller';
import { adminOnly } from '../middleware/auth';

const router = express.Router();

// Admin-only: list activity logs
router.get('/', getActivityLogs);

export default router;
