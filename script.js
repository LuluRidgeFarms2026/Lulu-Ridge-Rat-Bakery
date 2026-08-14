const PRICE_PER_TREAT = 2.5;

document.addEventListener('DOMContentLoaded', () => {
  const quantitySelector = document.getElementById('quantity-selector');
  const quantityValue = document.getElementById('quantity-value');
  const buyButton = document.getElementById('buy-button');
  const totalElement = document.querySelector('.total');

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
});
