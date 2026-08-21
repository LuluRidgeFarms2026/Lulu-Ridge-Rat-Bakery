require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const APP_SECRET = process.env.APP_SECRET || 'dev-local-payment-secret-change-me';
const cashAppAccounts = [
  process.env.CASHAPP_ACCOUNT_ONE || '$ElikaTacker',
  process.env.CASHAPP_ACCOUNT_TWO || '$LathanT150',
];
const orders = new Map();

function signPayload(payload) {
  return crypto.createHmac('sha256', APP_SECRET).update(JSON.stringify(payload)).digest('hex');
}

function getOrderSummary(quantity) {
  return Number((Number(quantity) * 2.5).toFixed(2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/create-order', (req, res) => {
  const { quantity = 1, customerName = '', customerEmail = '', paymentMethod = 'manual', isSubscription = false, subscriptionType = '', monthlyPrice = '' } = req.body || {};
  const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), 10);

  if (!customerName || !customerEmail) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const total = isSubscription ? Number(monthlyPrice) : getOrderSummary(safeQuantity);
  const orderId = `LRR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const paymentCode = crypto.randomBytes(5).toString('hex').toUpperCase();
  const createdAt = new Date().toISOString();
  const payload = {
    orderId,
    customerName,
    customerEmail,
    quantity: safeQuantity,
    total,
    paymentMethod,
    paymentCode,
    createdAt,
    isSubscription,
    subscriptionType,
  };

  const signature = signPayload(payload);
  const record = {
    ...payload,
    signature,
    status: 'pending',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  orders.set(orderId, record);

  return res.json({
    orderId,
    total,
    quantity: safeQuantity,
    paymentCode,
    paymentMethod,
    isSubscription,
    subscriptionType,
    cashAppAccounts,
    signature,
    createdAt,
    expiresAt: record.expiresAt,
    instructions: `Send $${total.toFixed(2)} using your selected local payment method. Use payment code ${paymentCode} as the reference.`,
    url: `/payment-success.html?orderId=${orderId}&amount=${total.toFixed(2)}&quantity=${safeQuantity}&name=${encodeURIComponent(customerName)}&paymentCode=${paymentCode}&signature=${signature}`,
  });
});

app.post('/api/confirm-order', (req, res) => {
  const { orderId, paymentCode, signature, amountSent, paymentDate, paymentProof } = req.body || {};

  if (!orderId || !paymentCode || !signature) {
    return res.status(400).json({ error: 'Order, payment code, and signature are required.' });
  }

  if (!amountSent || !paymentDate || !paymentProof) {
    return res.status(400).json({ error: 'You must confirm the amount sent, payment date, and proof/note before the order is marked paid.' });
  }

  const record = orders.get(orderId);

  if (!record) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const expectedSignature = signPayload({
    orderId: record.orderId,
    customerName: record.customerName,
    customerEmail: record.customerEmail,
    quantity: record.quantity,
    total: record.total,
    paymentMethod: record.paymentMethod,
    paymentCode: record.paymentCode,
    createdAt: record.createdAt,
  });

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Order signature is invalid.' });
  }

  if (record.paymentCode !== paymentCode) {
    return res.status(400).json({ error: 'Payment code is invalid.' });
  }

  const sentAmount = Number(amountSent);
  if (Number.isNaN(sentAmount) || sentAmount !== Number(record.total)) {
    return res.status(400).json({ error: 'The amount sent must match the order total exactly.' });
  }

  if (record.status === 'paid') {
    return res.json({ success: true, status: 'paid', message: 'Order already paid.' });
  }

  record.status = 'paid';
  record.paidAt = new Date().toISOString();
  record.amountSent = sentAmount;
  record.paymentDate = paymentDate;
  record.paymentProof = paymentProof;
  orders.set(orderId, record);

  return res.json({
    success: true,
    status: 'paid',
    message: 'Payment confirmed. Order marked as paid.',
    orderId,
    total: record.total,
    paymentCode,
    amountSent: sentAmount,
    paymentDate,
  });
});

app.get('/api/orders', (req, res) => {
  const items = Array.from(orders.values()).map((order) => ({
    orderId: order.orderId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    quantity: order.quantity,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentCode: order.paymentCode,
    status: order.status,
    createdAt: order.createdAt,
    amountSent: order.amountSent || null,
    paymentDate: order.paymentDate || null,
    paymentProof: order.paymentProof || null,
  }));

  const status = req.query.status || 'all';
  const filtered = status === 'all' ? items : items.filter((item) => item.status === status);
  return res.json({ orders: filtered });
});

app.listen(port, () => {
  console.log(`Lulu Ridge Rat Bakery server is running on http://localhost:${port}`);
});
