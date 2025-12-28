import { Router } from 'express';
import { createCustomerController, createSubscriptionController, paymentWebhook, getSubscriptionStatusController } from '../controllers/paymentController';

const router = Router();

router.post('/customer', createCustomerController);
router.post('/create-subscription', createSubscriptionController);
router.post('/webhook', paymentWebhook);
router.get('/status', getSubscriptionStatusController);

export default router;
