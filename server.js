require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/create-checkout-session', async (req, res) => {
  const { quantity = 1, customerName = '', customerEmail = '' } = req.body || {};
  const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), 10);

  if (!customerName || !customerEmail) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const total = (safeQuantity * 2.5).toFixed(2);
    const orderId = `LRR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return res.json({
      url: `${baseUrl}/payment-success.html?status=paid&orderId=${orderId}&quantity=${safeQuantity}&total=${total}&name=${encodeURIComponent(customerName)}`,
      orderId,
      total,
      quantity: safeQuantity,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      error: error.message || 'Unable to create checkout session.',
    });
  }
});

app.listen(port, () => {
  console.log(`Lulu Ridge Rat Bakery server is running on http://localhost:${port}`);
});
