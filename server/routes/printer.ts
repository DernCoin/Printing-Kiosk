import express from 'express';
import { listPrinters, addPrinter, removePrinter, activatePrinter, testPrint, printJob } from '../controllers/printerController.js';
import staffAuth from '../middleware/staffAuth.js';

const router = express.Router();

router.use(staffAuth);

router.get('/list', listPrinters);
router.post('/', addPrinter);
router.delete('/:id', removePrinter);
router.patch('/:id/activate', activatePrinter);
router.post('/:id/test', testPrint);
router.post('/print/:jobId', printJob);

export default router;
