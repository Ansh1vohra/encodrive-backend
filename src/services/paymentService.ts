import Razorpay from 'razorpay';
import crypto from 'crypto';
import { docClient } from '../utils/dynamoClient';

const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE || 'Subscriptions';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export interface SubscriptionResult {
  id: string;
  status: string;
  plan_id?: string;
  short_url?: string;
  [k: string]: any;
}

export async function createCustomer(name: string, email?: string, contact?: string) {
  const payload: any = { name };
  if (email) payload.email = email;
  if (contact) payload.contact = contact;
  const customer = await razorpay.customers.create(payload);
  return customer;
}

export async function createPlanIfNeeded(amount: number, currency = 'INR', period = 'monthly', planName = 'Subscription Plan') {
  // Create a plan on the fly. You may prefer creating plans in Razorpay dashboard.
  const plan = await razorpay.plans.create({
    period,
    interval: 1,
    item: {
      name: planName,
      amount: Math.round(amount),
      currency,
      description: planName,
    },
  });
  return plan;
}

export async function createSubscriptionForCustomer(opts: {
  customer_id: string;
  plan_id?: string;
  amount?: number; // used if plan_id not provided
  currency?: string;
  total_count?: number; // number of billing cycles
  user_email?: string;
}) : Promise<SubscriptionResult> {
  const { customer_id, plan_id, amount, currency = 'INR', total_count = 12 } = opts;

  let planId = plan_id;
  if (!planId) {
    if (!amount) throw new Error('Either plan_id or amount is required');
    const plan = await createPlanIfNeeded(amount, currency);
    planId = plan.id;
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    total_count,
    customer_id,
  });

  // Persist subscription in DynamoDB for frontend checks
  try {
    const item = {
      subscriptionId: subscription.id,
      customer_id: subscription.customer_id || customer_id,
      plan_id: subscription.plan_id || planId,
      status: subscription.status,
      createdAt: new Date().toISOString(),
      raw: subscription,
    } as any;

    if ((opts as any).user_email) item.user_email = (opts as any).user_email;

    await docClient.put({ TableName: SUBSCRIPTIONS_TABLE, Item: item }).promise();
  } catch (err) {
    console.warn('Failed to persist subscription to DynamoDB:', err);
  }

  return subscription as SubscriptionResult;
}

export function verifyWebhookSignature(body: string, signature: string) {
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body).digest('hex');
  return expected === signature;
}

export async function handleWebhookEvent(payload: any) {
  // Implement business logic here. Example: subscription.charged, payment.captured, invoice.paid
  const event = payload.event || payload.type;
  console.log('Razorpay webhook event type:', event);

  try {
    if (event && event.toString().startsWith('subscription.')) {
      const subscription = payload.payload?.subscription?.entity;
      if (subscription && subscription.id) {
        const status = subscription.status;
        await docClient.update({
          TableName: SUBSCRIPTIONS_TABLE,
          Key: { subscriptionId: subscription.id },
          UpdateExpression: 'SET #s = :s, updatedAt = :u, raw = :r',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':s': status, ':u': new Date().toISOString(), ':r': subscription },
        }).promise();
      }
    }

    // Payment events linked to a subscription
    if (event === 'payment.captured' || event === 'payment.failed' || event === 'payment.authorized') {
      const payment = payload.payload?.payment?.entity;
      const subscriptionId = payment?.subscription_id;
      if (subscriptionId) {
        const paymentStatus = payment.status || (event === 'payment.captured' ? 'captured' : 'failed');
        await docClient.update({
          TableName: SUBSCRIPTIONS_TABLE,
          Key: { subscriptionId },
          UpdateExpression: 'SET lastPaymentStatus = :p, lastPaymentAt = :t, updatedAt = :u',
          ExpressionAttributeValues: { ':p': paymentStatus, ':t': new Date().toISOString(), ':u': new Date().toISOString() },
        }).promise();
      }
    }
  } catch (err) {
    console.error('Error handling webhook event persistence:', err);
  }
}

export async function getSubscriptionByUserEmail(email: string) {
  try {
    const params = {
      TableName: SUBSCRIPTIONS_TABLE,
      FilterExpression: 'user_email = :e',
      ExpressionAttributeValues: { ':e': email },
    } as any;

    const res = await docClient.scan(params).promise();
    const items = res.Items || [];
    if (items.length === 0) return null;

    // pick the most recently created by createdAt if available
    items.sort((a: any, b: any) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return items[0];
  } catch (err) {
    console.error('Error querying subscriptions by user email:', err);
    return null;
  }
}
