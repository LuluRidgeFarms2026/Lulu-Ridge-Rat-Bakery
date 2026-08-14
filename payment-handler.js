const PRICE_PER_TREAT = 2.5;

document.addEventListener('DOMContentLoaded', () => {
  const totalElement = document.getElementById('payment-total');
  const checkoutForm = document.getElementById('checkout-form');
  const quantity = Math.max(1, Math.min(10, Number(new URLSearchParams(window.location.search).get('quantity') || 1)) || 1);
  const total = quantity * PRICE_PER_TREAT;
  const apiBaseUrl = window.location.hostname === 'localhost' && window.location.port === '8000'
    ? 'http://localhost:3000'
    : '';

  if (totalElement) {
    totalElement.textContent = `Total: $${total.toFixed(2)}`;
  }

  const checkoutSubmitButton = document.getElementById('checkout-submit-button');
  if (checkoutSubmitButton) {
    checkoutSubmitButton.textContent = 'Pay';
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const submitButton = document.getElementById('checkout-submit-button');
      const errorDiv = document.getElementById('checkout-errors');
      const name = document.getElementById('customer-name').value.trim();
      const email = document.getElementById('customer-email').value.trim();

      if (!name || !email) {
        errorDiv.textContent = 'Please enter your name and email.';
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';
      errorDiv.textContent = '';

      try {
        const response = await fetch(`${apiBaseUrl}/api/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quantity,
            customerName: name,
            customerEmail: email,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          throw new Error(data.error || 'Unable to start checkout.');
        }

        window.location.href = data.url;
      } catch (error) {
        errorDiv.textContent = error.message || 'Checkout is unavailable right now.';
        submitButton.disabled = false;
        submitButton.textContent = 'Pay';
      }
    });
  }
});
