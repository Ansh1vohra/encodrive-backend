import { Router } from 'express';
import { generateUploadUrl } from '../controllers/fileController';

const router = Router();

router.post('/upload-url', generateUploadUrl);

export default router;
