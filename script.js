const PRICE_PER_TREAT = 2.5;

document.addEventListener('DOMContentLoaded', () => {
  const quantitySelector = document.getElementById('quantity-selector');
  const quantityValue = document.getElementById('quantity-value');
  const quantityTotal = document.getElementById('quantity-total');
  const buyButton = document.getElementById('buy-button');
  const totalElement = document.querySelector('.total');

  if (quantitySelector && quantityValue && buyButton) {
    const syncQuantity = () => {
      const quantity = Number(quantitySelector.value);
      const total = quantity * PRICE_PER_TREAT;
      quantityValue.textContent = quantity;
      if (quantityTotal) {
        quantityTotal.textContent = total.toFixed(2);
      }
      buyButton.href = `payment.html?quantity=${quantity}`;
      console.log('Updated: quantity =', quantity, ', total =', total.toFixed(2));
    };

    quantitySelector.addEventListener('input', syncQuantity);
    syncQuantity();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const quantity = Math.max(1, Math.min(10, Number(urlParams.get('quantity') || 1)) || 1);
  const total = quantity * PRICE_PER_TREAT;

  if (totalElement && window.location.pathname.includes('payment')) {
    totalElement.textContent = `Total: $${total.toFixed(2)}`;
    console.log('Payment page total:', total.toFixed(2), 'for quantity:', quantity);
  }
});
