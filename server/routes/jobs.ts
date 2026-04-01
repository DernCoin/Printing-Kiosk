import express from 'express';
import {
  getJobs,
  getJob,
  createJob,
  updateJobSettings,
  updateJobStatus,
  markPaid,
  deleteJob,
  getJobHistory,
} from '../controllers/jobController.js';
import staffAuth from '../middleware/staffAuth.js';

const router = express.Router();

// Public routes (patron + staff)
router.get('/', getJobs);
router.get('/history', getJobHistory);
router.get('/:id', getJob);
router.post('/', createJob);
router.patch('/:id/settings', updateJobSettings);

// Staff-only routes
router.patch('/:id/status', staffAuth, updateJobStatus);
router.patch('/:id/paid', staffAuth, markPaid);
router.delete('/:id', staffAuth, deleteJob);

export default router;
