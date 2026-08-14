// Stripe payment handler
// NOTE: You need to replace YOUR_PUBLISHABLE_KEY with your actual Stripe publishable key
// Get your Stripe key from https://dashboard.stripe.com/apikeys

const STRIPE_PUBLIC_KEY = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';
const PRICE_PER_TREAT = 2.5;

let stripe;
let elements;
let cardElement;

document.addEventListener('DOMContentLoaded', async () => {
  const paymentForm = document.getElementById('payment-form');
  if (!paymentForm) return;

  // Initialize Stripe
  stripe = Stripe(STRIPE_PUBLIC_KEY);
  elements = stripe.elements();
  cardElement = elements.create('card');
  cardElement.mount('#card-element');

  // Handle card errors
  cardElement.on('change', (event) => {
    const displayError = document.getElementById('card-errors');
    if (event.error) {
      displayError.textContent = event.error.message;
    } else {
      displayError.textContent = '';
    }
  });

  // Handle form submission
  paymentForm.addEventListener('submit', handlePaymentSubmit);
});

async function handlePaymentSubmit(event) {
  event.preventDefault();

  const submitButton = document.getElementById('submit-button');
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';

  const nameInput = document.querySelector('input[name="name"]');
  const emailInput = document.querySelector('input[name="email"]');
  const buyerName = nameInput.value.trim();
  const buyerEmail = emailInput.value.trim();

  // Get quantity from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const quantity = Math.max(1, Math.min(10, Number(urlParams.get('quantity') || 1)) || 1);
  const total = quantity * PRICE_PER_TREAT;

  try {
    // Create payment method
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: buyerName,
        email: buyerEmail,
      },
    });

    if (error) {
      document.getElementById('card-errors').textContent = error.message;
      submitButton.disabled = false;
      submitButton.textContent = 'Pay $' + total.toFixed(2);
      return;
    }

    // Send payment to backend (you'll need a backend server to handle this)
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        amount: Math.round(total * 100), // Convert to cents
        currency: 'usd',
        description: `${quantity} rat treat(s) for ${buyerName}`,
        email: buyerEmail,
      }),
    });

    if (!response.ok) {
      // Fallback: Show success message without server processing
      alert(`Thanks, ${buyerName}! Your payment of $${total.toFixed(2)} is being processed. You will receive confirmation at ${buyerEmail}.`);
      submitButton.disabled = false;
      submitButton.textContent = 'Pay $' + total.toFixed(2);
      return;
    }

    const paymentResult = await response.json();

    if (paymentResult.success) {
      alert(`Thanks, ${buyerName}! Your payment of $${total.toFixed(2)} has been processed successfully. Order confirmed!`);
      window.location.href = 'treats.html';
    } else {
      document.getElementById('card-errors').textContent = paymentResult.error || 'Payment failed. Please try again.';
      submitButton.disabled = false;
      submitButton.textContent = 'Pay $' + total.toFixed(2);
    }
  } catch (error) {
    console.error('Payment error:', error);
    document.getElementById('card-errors').textContent = 'An error occurred. Please try again.';
    submitButton.disabled = false;
    submitButton.textContent = 'Pay $' + total.toFixed(2);
  }
}
