const PRICE_PER_TREAT = 2.5;

document.addEventListener('DOMContentLoaded', () => {
  const totalElement = document.getElementById('payment-total');
  const checkoutForm = document.getElementById('checkout-form');
  const paymentInstructions = document.getElementById('payment-instructions');
  const qrCodes = document.getElementById('cashapp-qr-codes');
  const params = new URLSearchParams(window.location.search);
  
  const isSubscription = params.get('isSubscription') === 'true';
  const subscriptionType = params.get('subscriptionType');
  const monthlyPrice = params.get('monthlyPrice');
  
  let quantity = Math.max(1, Math.min(10, Number(params.get('quantity') || 1)) || 1);
  let total = isSubscription ? Number(monthlyPrice) : quantity * PRICE_PER_TREAT;
  
  console.log('Payment handler loaded:', { quantity, total, isSubscription, subscriptionType });
  
  const apiBaseUrl = window.location.hostname === 'localhost' && window.location.port === '8000'
    ? 'http://localhost:3000'
    : '';

  if (totalElement) {
    if (isSubscription) {
      totalElement.textContent = `Monthly Subscription: $${total.toFixed(2)} (10% discount applied)`;
    } else {
      totalElement.textContent = `Total: $${total.toFixed(2)}`;
    }
  }

  if (paymentInstructions) {
    if (isSubscription) {
      paymentInstructions.innerHTML = `<strong>Subscription:</strong> Your payment will recur monthly. Send the total to the Cash App account below using the payment code shown after checkout. Cancel anytime.`;
    } else {
      paymentInstructions.innerHTML = 'After you click Pay, scan both QR codes and send the displayed amount to each Cash App account.';
    }
  }

  const checkoutSubmitButton = document.getElementById('checkout-submit-button');
  if (checkoutSubmitButton) {
    const buttonAmount = document.getElementById('button-amount');
    if (buttonAmount) {
      buttonAmount.textContent = `$${total.toFixed(2)}`;
    }
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const submitButton = document.getElementById('checkout-submit-button');
      const errorDiv = document.getElementById('checkout-errors');
      const name = document.getElementById('customer-name').value.trim();
      const email = document.getElementById('customer-email').value.trim();
      const paymentMethod = document.getElementById('payment-method').value;

      if (!name || !email) {
        errorDiv.textContent = 'Please enter your name and email.';
        return;
      }

      submitButton.disabled = true;
      submitButton.innerHTML = 'Creating secure order...';
      errorDiv.textContent = '';
      console.log('Starting checkout for', { name, email, paymentMethod, quantity, total, isSubscription, subscriptionType });

      try {
        const response = await fetch(`${apiBaseUrl}/api/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quantity,
            customerName: name,
            customerEmail: email,
            paymentMethod,
            isSubscription,
            subscriptionType,
            monthlyPrice: isSubscription ? total.toFixed(2) : undefined,
          }),
        });

        const data = await response.json();
        console.log('Order created response:', data);

        if (!response.ok || !data.orderId) {
          throw new Error(data.error || 'Unable to create your secure order.');
        }

        if (paymentInstructions) {
          paymentInstructions.innerHTML = `
            <strong>Amount:</strong> $${Number(data.total).toFixed(2)}<br>
            <strong>Payment code:</strong> ${data.paymentCode}<br>
            Send both amounts and include the payment code in each note.${isSubscription ? '<br><strong>Note:</strong> This will recur monthly.' : ''}
          `;
        }

        if (qrCodes) {
          const totalCents = Math.round(Number(data.total) * 100);
          const firstAmount = Math.floor(totalCents / 2) / 100;
          const secondAmount = (totalCents - Math.floor(totalCents / 2)) / 100;
          const amounts = [firstAmount, secondAmount];
          const accounts = Array.isArray(data.cashAppAccounts) ? data.cashAppAccounts : [];

          if (accounts.length !== 2 || accounts.some((account) => !account)) {
            qrCodes.hidden = false;
            qrCodes.innerHTML = '<p class="error-message">Cash App recipients are not configured yet. Please contact us before sending payment.</p>';
          } else {
            qrCodes.hidden = false;
            qrCodes.innerHTML = accounts.map((account, index) => {
              const cashtag = account.replace(/^[$@]/, '');
              const paymentUrl = `https://cash.app/$${encodeURIComponent(cashtag)}?amount=${amounts[index].toFixed(2)}&note=${encodeURIComponent(data.paymentCode)}`;
              const qrUrl = `https://quickchart.io/qr?size=240&text=${encodeURIComponent(paymentUrl)}`;
              return `<div class="cashapp-qr"><h2>Send $${amounts[index].toFixed(2)} to ${account}</h2><img src="${qrUrl}" alt="Cash App QR code for ${account}"><a class="nav-link" href="${paymentUrl}" target="_blank" rel="noopener">Open Cash App</a></div>`;
            }).join('');
          }
        }

        console.log('Redirecting to:', data.url);
        setTimeout(() => {
          window.location.href = data.url;
        }, 500);
      } catch (error) {
        console.error('Checkout error:', error);
        errorDiv.textContent = error.message || 'Checkout is unavailable right now.';
        submitButton.disabled = false;
        submitButton.innerHTML = `Pay <span id="button-amount">$${total.toFixed(2)}</span>`;
      }
    });
  }
});
