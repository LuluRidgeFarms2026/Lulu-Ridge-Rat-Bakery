document.addEventListener('DOMContentLoaded', () => {
  const subscriptionButtons = document.querySelectorAll('button[data-plan]');

  const plans = {
    small: {
      quantity: 2,
      monthlyPrice: 4.50,
      label: 'Small Monthly Subscription (2 treats)',
    },
    large: {
      quantity: 5,
      monthlyPrice: 11.25,
      label: 'Large Monthly Subscription (5 treats)',
    },
  };

  subscriptionButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();

      const planName = button.getAttribute('data-plan');
      const plan = plans[planName];

      if (!plan) {
        console.error('Unknown subscription plan:', planName);
        return;
      }

      console.log('Selected subscription plan:', plan);

      // Redirect to payment page with subscription parameters
      const params = new URLSearchParams({
        quantity: plan.quantity,
        isSubscription: 'true',
        monthlyPrice: plan.monthlyPrice.toFixed(2),
        subscriptionType: planName,
      });

      window.location.href = `payment.html?${params.toString()}`;
    });
  });
});
