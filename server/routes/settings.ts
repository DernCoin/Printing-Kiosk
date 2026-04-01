import express from 'express';
import {
  getSettings,
  getSetting,
  updateSetting,
  updateSettings,
} from '../controllers/settingsController.js';
import staffAuth from '../middleware/staffAuth.js';

const router = express.Router();

// Public (patron needs pricing info)
router.get('/', getSettings);
router.get('/:key', getSetting);

// Staff-only
router.put('/', staffAuth, updateSettings);
router.put('/:key', staffAuth, updateSetting);

export default router;
