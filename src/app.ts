import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/user';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/', (_, res) => {
  res.send("API is working ✅");
});

app.use((req, res, next) => {
  if (req.is('application/json') && Buffer.isBuffer(req.body) && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (err) {
      console.error('Error parsing JSON:', err);
    }
  }
  next();
});


app.use('/api/user', userRoutes);

export default app;
