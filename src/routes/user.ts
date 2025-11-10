import { Router } from 'express';
import { getUserDetails, signIn, verifyOTP, googleSignIn, getUserFiles, ldapSignIn } from '../controllers/userController';

const router = Router();

router.post('/signin', signIn);
router.post('/ldap-signin', ldapSignIn);
router.post('/verify-otp', verifyOTP);
router.get('/user-details', getUserDetails);
router.get('/user-files',getUserFiles);
router.post("/google-signin", googleSignIn);

export default router;
