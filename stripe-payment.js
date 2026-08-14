// Simple payment handler with SMS confirmation
const PRICE_PER_TREAT = 2.5;
const ORDER_PHONE = '5017573635';

document.addEventListener('DOMContentLoaded', () => {
  const paymentForm = document.getElementById('payment-form');
  if (!paymentForm) return;

  // Handle form submission
  paymentForm.addEventListener('submit', handlePaymentSubmit);
});

function handlePaymentSubmit(event) {
  event.preventDefault();

  const submitButton = document.getElementById('submit-button');
  const nameInput = document.querySelector('input[name="name"]');
  const emailInput = document.querySelector('input[name="email"]');
  const buyerName = nameInput.value.trim();
  const buyerEmail = emailInput.value.trim();

  if (!buyerName || !buyerEmail) {
    document.getElementById('card-errors').textContent = 'Please enter your name and email.';
    return;
  }

  // Get quantity from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const quantity = Math.max(1, Math.min(10, Number(urlParams.get('quantity') || 1)) || 1);
  const total = quantity * PRICE_PER_TREAT;
  const treatWord = quantity === 1 ? 'treat' : 'treats';

  // Show processing
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';

  // Create SMS message with order details
  const message = `Order: ${quantity} ${treatWord} for ${buyerName} (${buyerEmail}). Total: $${total.toFixed(2)}`;
  const smsLink = `sms:${ORDER_PHONE}?body=${encodeURIComponent(message)}`;

  // Show success message and send SMS
  setTimeout(() => {
    alert(`Thanks, ${buyerName}! Your payment of $${total.toFixed(2)} has been confirmed. Order details are being sent.`);
    window.location.href = smsLink;
  }, 500);
}

