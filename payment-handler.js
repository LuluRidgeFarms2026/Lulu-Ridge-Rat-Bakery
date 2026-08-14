// Payment Handler - Card and CashApp
const PRICE_PER_TREAT = 2.5;
const OWNER_PHONE = '+15017573635'; // Your phone number for SMS

// Test card balances (for demo purposes)
// In production, these would be checked against real payment processor
const TEST_CARDS = {
  '4532015112830366': { balance: 5000, status: 'active' },    // Has enough funds
  '4024007134432310': { balance: 1.00, status: 'active' },    // Insufficient funds
  '4539111111111111': { balance: 0, status: declined },       // Declined card
};

document.addEventListener('DOMContentLoaded', () => {
  const cardForm = document.getElementById('card-payment-form');
  const cashappForm = document.getElementById('cashapp-payment-form');
  const methodButtons = document.querySelectorAll('.method-btn');

  // Payment method selector
  methodButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      methodButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const method = btn.dataset.method;
      document.querySelectorAll('.payment-form').forEach((form) => {
        form.classList.remove('active-method');
      });

      if (method === 'card') {
        cardForm.classList.add('active-method');
      } else if (method === 'cashapp') {
        cashappForm.classList.add('active-method');
      }
    });
  });

  // Card payment submission
  if (cardForm) {
    cardForm.addEventListener('submit', handleCardPayment);
  }

  // CashApp payment submission
  if (cashappForm) {
    cashappForm.addEventListener('submit', handleCashAppPayment);
  }
});

function handleCardPayment(event) {
  event.preventDefault();

  const submitButton = document.getElementById('card-submit-button');
  const errorDiv = document.getElementById('card-errors');
  errorDiv.textContent = '';

  const name = document.querySelector('#card-payment-form input[name="name"]').value.trim();
  const email = document.querySelector('#card-payment-form input[name="email"]').value.trim();
  const cardInput = document.querySelector('#card-payment-form input[name="card"]').value.trim();
  const expiry = document.querySelector('#card-payment-form input[name="expiry"]').value.trim();
  const cvv = document.querySelector('#card-payment-form input[name="cvv"]').value.trim();

  // Validate inputs
  if (!name || !email || !cardInput || !expiry || !cvv) {
    errorDiv.textContent = 'Please fill in all card details.';
    return;
  }

  // Format and validate card number
  const cardNumber = cardInput.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(cardNumber)) {
    errorDiv.textContent = 'Invalid card number format.';
    return;
  }

  // Validate expiry format
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    errorDiv.textContent = 'Expiry must be in MM/YY format.';
    return;
  }

  // Validate CVV
  if (!/^\d{3,4}$/.test(cvv)) {
    errorDiv.textContent = 'Invalid CVV.';
    return;
  }

  // Show processing
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';

  // Simulate card processing
  setTimeout(() => {
    const result = processCardPayment(cardNumber, name, email);

    if (!result.success) {
      errorDiv.textContent = result.error;
      submitButton.disabled = false;
      submitButton.textContent = 'Pay $2.50';
      return;
    }

    // Get quantity
    const urlParams = new URLSearchParams(window.location.search);
    const quantity = Math.max(1, Math.min(10, Number(urlParams.get('quantity') || 1)) || 1);
    const total = quantity * PRICE_PER_TREAT;
    const treatWord = quantity === 1 ? 'treat' : 'treats';

    // Send SMS
    sendSMS(name, email, quantity, treatWord, total, 'card');

    // Show success
    alert(`Payment Successful!\n\nThank you, ${name}! Your payment of $${total.toFixed(2)} has been processed.\n\nOrder confirmation has been sent.`);
    window.location.href = 'treats.html';
  }, 1000);
}

function handleCashAppPayment(event) {
  event.preventDefault();

  const submitButton = document.getElementById('cashapp-submit-button');
  const errorDiv = document.getElementById('cashapp-errors');
  errorDiv.textContent = '';

  const name = document.querySelector('#cashapp-payment-form input[name="name"]').value.trim();
  const email = document.querySelector('#cashapp-payment-form input[name="email"]').value.trim();
  const cashapp = document.querySelector('#cashapp-payment-form input[name="cashapp"]').value.trim();

  if (!name || !email || !cashapp) {
    errorDiv.textContent = 'Please fill in all fields.';
    return;
  }

  // Show processing
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';

  setTimeout(() => {
    // Get quantity
    const urlParams = new URLSearchParams(window.location.search);
    const quantity = Math.max(1, Math.min(10, Number(urlParams.get('quantity') || 1)) || 1);
    const total = quantity * PRICE_PER_TREAT;
    const treatWord = quantity === 1 ? 'treat' : 'treats';

    // Send SMS
    sendSMS(name, email, quantity, treatWord, total, 'cashapp', cashapp);

    // Show success
    alert(`CashApp Payment Initiated!\n\nThank you, ${name}! Please send $${total.toFixed(2)} to ${cashapp}.\n\nOrder details have been sent to us.`);
    window.location.href = 'treats.html';
  }, 800);
}

function processCardPayment(cardNumber, name, email) {
  // Check if card exists in test database
  if (TEST_CARDS[cardNumber]) {
    const cardInfo = TEST_CARDS[cardNumber];

    if (cardInfo.status !== 'active') {
      return { success: false, error: 'Card declined. Please use a different card.' };
    }

    // Check balance (default: $2.50)
    if (cardInfo.balance < PRICE_PER_TREAT) {
      return {
        success: false,
        error: `Insufficient funds. Card balance: $${(cardInfo.balance / 100).toFixed(2)}, Amount needed: $${PRICE_PER_TREAT.toFixed(2)}`,
      };
    }

    // Deduct balance
    cardInfo.balance -= PRICE_PER_TREAT * 100;
    return { success: true };
  }

  // For unknown cards, do basic Luhn validation
  if (!luhnCheck(cardNumber)) {
    return { success: false, error: 'Invalid card number.' };
  }

  // Process as real payment in production (integrate with Stripe/Square)
  return { success: true };
}

function luhnCheck(num) {
  let sum = 0;
  let isEven = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function sendSMS(name, email, quantity, treatWord, total, method, cashappTag = null) {
  let messageBody;

  if (method === 'card') {
    messageBody = `PAYMENT RECEIVED!\nCustomer: ${name}\nEmail: ${email}\nOrder: ${quantity} ${treatWord}\nTotal: $${total.toFixed(2)}\nMethod: Credit Card\nTime: ${new Date().toLocaleString()}`;
  } else {
    messageBody = `CASHAPP PAYMENT PENDING!\nCustomer: ${name}\nEmail: ${email}\nCashApp Tag: ${cashappTag}\nOrder: ${quantity} ${treatWord}\nAmount: $${total.toFixed(2)}\nTime: ${new Date().toLocaleString()}`;
  }

  // Send SMS via fetch to backend or third-party SMS service
  // For now, this logs the message (in production, use Twilio, AWS SNS, etc.)
  console.log('SMS Message to send:', messageBody);

  // Uncomment below if you have a Twilio backend setup
  /*
  fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: OWNER_PHONE,
      message: messageBody,
    }),
  }).catch((err) => console.error('SMS error:', err));
  */

  // Alternative: Use Twilio client-side (requires auth token)
  // This is a fallback - production should use backend
  sendViaTwilio(OWNER_PHONE, messageBody);
}

function sendViaTwilio(phoneNumber, message) {
  // This is a placeholder for Twilio integration
  // In production, you would set up a backend endpoint that uses Twilio
  // Example backend endpoint: POST /api/send-sms with auth token

  // For now, we'll use a fetch to a webhook or backend service
  fetch('/.netlify/functions/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phoneNumber,
      message: message,
    }),
  }).catch(() => {
    // If no backend available, just log it
    console.log('SMS queued for:', phoneNumber);
  });
}

// Helper function to format card input
document.addEventListener('DOMContentLoaded', () => {
  const cardInput = document.querySelector('#card-payment-form input[name="card"]');
  if (cardInput) {
    cardInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '');
      let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formatted;
    });
  }

  const expiryInput = document.querySelector('#card-payment-form input[name="expiry"]');
  if (expiryInput) {
    expiryInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      e.target.value = value;
    });
  }
});
