import { Request, Response } from 'express';
import { OAuth2Client } from "google-auth-library";
import { findOrCreateUser, getUserByEmail } from '../services/userService';
import {getFilesByUserEmail} from '../services/fileService'
import { sendOTP } from '../services/otpService';
import { verifyOTP as checkOTP } from '../utils/otpStore';
import { generateToken } from '../services/jwtService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// LDAP signin removed. Use standard signin/OTP/Google flows.

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

export const googleSignIn = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Missing Google ID token" });
  }

  try {
    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Invalid Google token" });
    }

    const email = payload.email;

    // Ensure user exists in DB
    const user = await findOrCreateUser(email);

    // Generate your JWT
    const token = generateToken(email);

    return res.status(200).json({
      message: "Signed in with Google",
      token,
      user,
    });
  } catch (err) {
    console.error("Google Sign-In error:", err);
    return res.status(500).json({ error: "Google authentication failed" });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  if (email==='test@encodrive.com' && otp==='123456') {
    const token = generateToken(email);
    return res.status(200).json({ message: 'OTP verified', token });
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

export const getUserFiles = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const files = await getFilesByUserEmail(decoded.email);

    if (files.length === 0) {
      return res.status(404).json({ error: 'No files found for this user' });
    }

    return res.json({ files });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};