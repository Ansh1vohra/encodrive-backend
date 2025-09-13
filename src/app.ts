import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from "./routes/user";
import fileRoutes from "./routes/file";

dotenv.config();

const app = express();

// 1. Apply CORS first
app.use(cors());

// 2. Only parse JSON for requests that have JSON content type AND are not GET/HEAD/DELETE
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip JSON parsing for GET, HEAD, DELETE requests since they typically don't have bodies
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
    return next();
  }

  // Only parse if content-type is application/json
  if (req.headers['content-type'] === 'application/json') {
    let data = '';
    
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      data += chunk;
    });
    
    req.on('end', () => {
      try {
        // Handle empty body
        if (!data.trim()) {
          req.body = {};
          return next();
        }

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
    // For non-JSON requests, move to next middleware
    next();
  }
});

// Helper function to check if a string is base64 encoded
function isBase64(str: string): boolean {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (err) {
    return false;
  }
}

app.get('/health', (_: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

app.use('/api/user', userRoutes);
app.use('/api/file', fileRoutes);

export default app;