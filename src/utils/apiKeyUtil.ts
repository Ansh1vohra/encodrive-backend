import crypto from 'crypto';

const secret = process.env.API_KEY_SECRET || 'secretkey';

export const encryptAPIKey = (apiKey: string): string => {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};


export const decryptAPIKey = (encrypted: string): string => {
  const [ivHex, encryptedData] = encrypted.split(':');

  if (!ivHex || !encryptedData) {
    throw new Error('Invalid encrypted API key format');
  }

  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedData, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedBuffer).toString('utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};