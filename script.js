document.addEventListener('DOMContentLoaded', () => {
  const paymentForm = document.getElementById('payment-form');

  if (!paymentForm) return;

  paymentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameInput = paymentForm.querySelector('input[name="name"]');
    const buyerName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'friend';
    alert(`Thanks, ${buyerName}! Please send $2.50 to Cash App $ElikaTacker.`);
  });
});
