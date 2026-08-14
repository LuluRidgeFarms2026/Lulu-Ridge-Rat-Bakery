const GOOGLE_CLIENT_ID = '963908778679-j8oofk9bpjupkhs5pkobu0mjo4emnsfu.apps.googleusercontent.com';
const PRICE_PER_TREAT = 2.5;
const ORDER_PHONE = '5017573635';

document.addEventListener('DOMContentLoaded', () => {
  const googleSignInButton = document.getElementById('google-signin');
  const quantitySelector = document.getElementById('quantity-selector');
  const quantityValue = document.getElementById('quantity-value');
  const buyButton = document.getElementById('buy-button');
  const totalElement = document.querySelector('.total');



  if (window.google && window.google.accounts && googleSignInButton) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        alert(`Welcome, ${payload.name || 'friend'}! Google sign-in is ready.`);
      },
    });

    googleSignInButton.addEventListener('click', () => {
      window.google.accounts.id.prompt();
    });
  }

  if (quantitySelector && quantityValue && buyButton) {
    const syncQuantity = () => {
      const quantity = Number(quantitySelector.value);
      quantityValue.textContent = quantity;
      buyButton.href = `payment.html?quantity=${quantity}`;
    };

    quantitySelector.addEventListener('input', syncQuantity);
    syncQuantity();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const quantity = Math.max(1, Math.min(10, Number(urlParams.get('quantity') || 1)) || 1);
  const total = quantity * PRICE_PER_TREAT;

  if (totalElement) {
    totalElement.textContent = `Total: $${total.toFixed(2)}`;
  }

  if (paymentInstructions) {
    paymentInstructions.textContent = `Send exactly $${total.toFixed(2)} to the card number above.`;
  }

  if (!paymentForm) return;

  // Old payment form handling removed - now uses stripe-payment.js
});
