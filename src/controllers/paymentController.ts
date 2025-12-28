import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createCustomer, createSubscriptionForCustomer, verifyWebhookSignature, handleWebhookEvent, getSubscriptionByUserEmail } from '../services/paymentService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const createCustomerController = async (req: Request, res: Response) => {
  const { name, email, contact } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });
  try {
    const customer = await createCustomer(name, email, contact);
    return res.status(201).json({ customer });
  } catch (err) {
    console.error('createCustomer error:', err);
    return res.status(500).json({ error: 'Failed to create customer' });
  }
};

export const createSubscriptionController = async (req: Request, res: Response) => {
  const { customer_id, plan_id, amount, currency, total_count, user_email } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'Missing customer_id' });

  try {
    const subscription = await createSubscriptionForCustomer({ customer_id, plan_id, amount, currency, total_count, user_email });
    return res.status(201).json({ subscription });
  } catch (err) {
    console.error('createSubscription error:', err);
    return res.status(500).json({ error: 'Failed to create subscription', details: (err instanceof Error) ? err.message : err });
  }
};

export const paymentWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const body = JSON.stringify(req.body);

  if (!signature) return res.status(400).send('missing signature');

  const valid = verifyWebhookSignature(body, signature);
  if (!valid) {
    console.warn('Invalid webhook signature');
    return res.status(400).send('invalid signature');
  }

  try {
    await handleWebhookEvent(req.body);
    return res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook handling error:', err);
    return res.status(500).send('error');
  }
};

export const getSubscriptionStatusController = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    if (!decoded || !decoded.email) return res.status(401).json({ error: 'Invalid token' });

    const subscription = await getSubscriptionByUserEmail(decoded.email);
    if (!subscription) {
      return res.json({ subscribed: false });
    }

    return res.json({ subscribed: true, status: subscription.status || 'unknown', subscription });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
