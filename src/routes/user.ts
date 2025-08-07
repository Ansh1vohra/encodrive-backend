import { Router } from 'express';
import { getUserDetails, signIn, verifyOTP } from '../controllers/userController';

const router = Router();

router.post('/signin', signIn);
router.post('/verify-otp', verifyOTP);
router.get('/user-details', getUserDetails);

export default router;
