import { Router } from 'express';
import { generateUploadUrl,getFileMetadata } from '../controllers/fileController';

const router = Router();

router.post('/upload-url', generateUploadUrl);
router.post('/metadata', getFileMetadata);

export default router;
