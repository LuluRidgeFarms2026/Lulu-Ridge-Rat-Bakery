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
const orderNotificationNumber = process.env.ORDER_NOTIFICATION_NUMBER || '+15017573635';
const orders = new Map();

async function sendOrderSms(order) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return false;
  }

  const message = [
    `New Lulu Ridge order ${order.orderId}`,
    `Quantity: ${order.quantity}`,
    `Name: ${order.customerName}`,
    `Shipping address: ${order.shippingAddress}`,
  ].join('\n');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: orderNotificationNumber, From: fromNumber, Body: message }),
  });

  if (!response.ok) {
    throw new Error(`SMS provider returned ${response.status}.`);
  }

  return true;
}

async function sendKlaviyoOrderEvent(order) {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const profileId = process.env.KLAVIYO_NOTIFICATION_PROFILE_ID;

  if (!apiKey || !profileId) {
    return false;
  }

  const response = await fetch('https://a.klaviyo.com/api/events', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      'content-type': 'application/json',
      revision: '2024-10-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          metric: { data: { type: 'metric', attributes: { name: 'Order Created' } } },
          properties: {
            order_id: order.orderId,
            quantity: order.quantity,
            customer_name: order.customerName,
            shipping_address: order.shippingAddress,
          },
          profile: { data: { type: 'profile', id: profileId } },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Klaviyo returned ${response.status}.`);
  }

  return true;
}

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

app.post('/api/create-order', async (req, res) => {
  const { quantity = 1, customerName = '', customerAge = '', customerEmail = '', shippingAddress = '', smsConsent = false, paymentMethod = 'manual', isSubscription = false, subscriptionType = '', monthlyPrice = '' } = req.body || {};
  const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), 10);
  const safeAge = Number(customerAge);

  if (!customerName || !customerEmail || !shippingAddress || !smsConsent || !Number.isInteger(safeAge) || safeAge < 1 || safeAge > 120) {
    return res.status(400).json({ error: 'Name, age, email, shipping address, and SMS consent are required.' });
  }

  const total = isSubscription ? Number(monthlyPrice) : getOrderSummary(safeQuantity);
  const orderId = `LRR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const paymentCode = crypto.randomBytes(5).toString('hex').toUpperCase();
  const createdAt = new Date().toISOString();
  const payload = {
    orderId,
    customerName,
    customerAge: safeAge,
    customerEmail,
    shippingAddress,
    smsConsent: true,
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

  let notificationSent = false;
  try {
    notificationSent = await sendOrderSms(record);
  } catch (error) {
    console.error('Order SMS failed:', error.message);
  }
  let klaviyoEventSent = false;
  try {
    klaviyoEventSent = await sendKlaviyoOrderEvent(record);
  } catch (error) {
    console.error('Klaviyo order event failed:', error.message);
  }

  return res.json({
    orderId,
    total,
    quantity: safeQuantity,
    paymentCode,
    paymentMethod,
    isSubscription,
    subscriptionType,
    cashAppAccounts,
    notificationSent,
    klaviyoEventSent,
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
    customerAge: record.customerAge,
    customerEmail: record.customerEmail,
    shippingAddress: record.shippingAddress,
    smsConsent: record.smsConsent,
    quantity: record.quantity,
    total: record.total,
    paymentMethod: record.paymentMethod,
    paymentCode: record.paymentCode,
    createdAt: record.createdAt,
    isSubscription: record.isSubscription,
    subscriptionType: record.subscriptionType,
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
