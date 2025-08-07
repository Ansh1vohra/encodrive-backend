import nodemailer from 'nodemailer';
import { saveOTP } from '../utils/otpStore';

export const sendOTP = async (email: string) => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  saveOTP(email, otp);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
    <h2 style="color: #4A90E2;">🔐 Your OTP for Encodrive</h2>
    <p style="font-size: 16px;">Hi there,</p>
    <p style="font-size: 16px;">Your One-Time Password (OTP) is:</p>
    <p style="font-size: 24px; font-weight: bold; color: #4A90E2;">${otp}</p>
    <p style="font-size: 14px; color: #555;">Please use this code within the next 5 minutes to complete your authentication.</p>
    <hr style="margin: 20px 0;">
    <p style="font-size: 12px; color: #aaa;">If you didn’t request this OTP, please ignore this email.</p>
    <p style="font-size: 12px; color: #aaa;">— Encodrive Team</p>
  </div>
`;

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Your OTP for Encodrive',
    // text: `Your OTP is: ${otp}`,
    html: htmlContent,
  });

  return otp;
};
