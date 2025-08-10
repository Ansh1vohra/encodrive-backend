import { Router } from 'express';
import { generateUploadUrl } from '../controllers/fileController';

const router = Router();

router.get('/upload-url', generateUploadUrl);

export default router;
