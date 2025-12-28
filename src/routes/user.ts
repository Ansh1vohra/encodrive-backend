import { Router } from 'express';
import { getUserDetails, signIn, verifyOTP, googleSignIn, getUserFiles } from '../controllers/userController';

const router = Router();

router.post('/signin', signIn);
router.post('/verify-otp', verifyOTP);
router.get('/user-details', getUserDetails);
router.get('/user-files', getUserFiles);
router.post('/google-signin', googleSignIn);

export default router;
