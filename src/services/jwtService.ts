import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (email: string) => {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { email: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    return decoded;
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};