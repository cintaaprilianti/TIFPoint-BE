import express from 'express';
import {
  getActivityStatistics,
  getAdminDashboard,
  getLeaderboard,
  getStudentDashboard,
  getStudentRecommendations,
  getStudentStatistics,
} from '../controllers/dashboard.controller';
import { adminOnly, auth } from '../middleware/auth';
import { studentOnly } from '../middleware/roleGuard'; // pastikan path benar

const router = express.Router();

// HANYA MAHASISWA
router.get('/student', auth, studentOnly, getStudentDashboard);

// HANYA ADMIN
router.get('/admin', auth, adminOnly, getAdminDashboard);

// Get detailed student statistics (admin only)
router.get('/student/:id/statistics', auth, adminOnly, getStudentStatistics);

// Get leaderboard (public or protected based on requirements)
router.get('/leaderboard', auth, getLeaderboard);

// Get activity statistics (admin only)
router.get('/statistics', auth, adminOnly, getActivityStatistics);

// Get recommendations for student
router.get('/recommendations', auth, getStudentRecommendations);

export default router;
