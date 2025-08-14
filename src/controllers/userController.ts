import { Request, Response } from 'express';
import { findOrCreateUser, getUserByEmail } from '../services/userService';
import { sendOTP } from '../services/otpService';
import { verifyOTP as checkOTP } from '../utils/otpStore';
import { generateToken } from '../services/jwtService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const signIn = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await findOrCreateUser(email);
    await sendOTP(email);
    return res.status(200).json({ message: 'OTP sent to email' });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong', details: err });
  }
};



export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const isValid = checkOTP(email, Number(otp));

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  const token = generateToken(email);

  return res.status(200).json({ message: 'OTP verified', token });
};

export const getUserDetails = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const user = await getUserByEmail(decoded.email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};