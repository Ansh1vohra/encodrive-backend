import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from "./routes/user";
import fileRoutes from "./routes/file";

dotenv.config();

const app = express();

// 1. Apply CORS first
app.use(cors());

// 3. API Gateway Lambda Proxy Compatibility Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.headers['content-type'] === 'application/json') {
    let data = '';
    
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      data += chunk;
    });
    
    req.on('end', () => {
      try {
        // Handle API Gateway's base64 encoding
        if (data.trim().startsWith('{') && data.trim().endsWith('}')) {
          // Regular JSON request
          req.body = JSON.parse(data);
        } else {
          // Try to parse as it might be API Gateway's format
          const parsed = JSON.parse(data);
          if (parsed.body) {
            // This is likely API Gateway format with base64 encoded body
            if (isBase64(parsed.body)) {
              const decoded = Buffer.from(parsed.body, 'base64').toString('utf8');
              req.body = JSON.parse(decoded);
            } else {
              req.body = JSON.parse(parsed.body);
            }
          } else {
            req.body = parsed;
          }
        }
      } catch (error) {
        console.error('Error parsing JSON body:', error);
        req.body = {};
      }
      next();
    });
  } else {
    // For non-JSON requests, use built-in parsers
    express.json()(req, res, next);
  }
});

// Helper function to check if a string is base64 encoded
function isBase64(str: string): boolean {
  try {
    // In Node.js, use Buffer for base64 checking
    if (typeof window === 'undefined') {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } else {
      // For browser environment
      return btoa(atob(str)) === str;
    }
  } catch (err) {
    return false;
  }
}

// ... rest of your app configuration
app.get('/health', (_: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

app.use('/api/user', userRoutes);
app.use('/api/file', fileRoutes);

export default app;