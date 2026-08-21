const PRICE_PER_TREAT = 2.5;
const FALLBACK_CASH_APP_ACCOUNTS = ['$ElikaTacker', '$LathanT150'];

document.addEventListener('DOMContentLoaded', () => {
  const totalElement = document.getElementById('payment-total');
  const checkoutForm = document.getElementById('checkout-form');
  const paymentInstructions = document.getElementById('payment-instructions');
  const qrCodes = document.getElementById('cashapp-qr-codes');
  const oldButtonAmount = document.getElementById('button-amount');
  const params = new URLSearchParams(window.location.search);

  if (oldButtonAmount) {
    oldButtonAmount.remove();
  }

  try {
    const savedDetails = JSON.parse(sessionStorage.getItem('luluRidgeCustomerDetails') || 'null');
    if (savedDetails) {
      document.getElementById('customer-name').value = savedDetails.name || '';
      document.getElementById('customer-age').value = savedDetails.age || '';
      document.getElementById('customer-email').value = savedDetails.email || '';
      document.getElementById('shipping-address').value = savedDetails.address || '';
      document.getElementById('sms-consent').checked = savedDetails.smsConsent === true;
    }
  } catch (error) {
    console.warn('Saved order details could not be loaded.', error);
  }
  
  const isSubscription = params.get('isSubscription') === 'true';
  const subscriptionType = params.get('subscriptionType');
  const monthlyPrice = params.get('monthlyPrice');
  
  let quantity = Math.max(1, Math.min(10, Number(params.get('quantity') || 1)) || 1);
  let total = isSubscription ? Number(monthlyPrice) : quantity * PRICE_PER_TREAT;
  
  console.log('Payment handler loaded:', { quantity, total, isSubscription, subscriptionType });
  
  const apiBaseUrl = window.location.hostname === 'localhost' && window.location.port === '8000'
    ? 'http://localhost:3000'
    : '';
  const isGithubPages = window.location.hostname.endsWith('.github.io');

  function renderCashAppPayments(data, cashAppWindow) {
    if (!qrCodes) {
      return;
    }

    const totalCents = Math.round(Number(data.total) * 100);
    const firstAmount = Math.floor(totalCents / 2) / 100;
    const secondAmount = (totalCents - Math.floor(totalCents / 2)) / 100;
    const amounts = [firstAmount, secondAmount];
    const accounts = Array.isArray(data.cashAppAccounts) ? data.cashAppAccounts : [];

    if (accounts.length !== 2 || accounts.some((account) => !account)) {
      qrCodes.hidden = false;
      qrCodes.innerHTML = '<p class="error-message">Cash App recipients are not configured yet. Please contact us before sending payment.</p>';
      return;
    }

    const paymentUrls = accounts.map((account, index) => {
      const cashtag = account.replace(/^[$@]/, '');
      const note = `Order ${data.paymentCode} - ${data.quantity} treat(s)`;
      return `https://cash.app/$${encodeURIComponent(cashtag)}?amount=${amounts[index].toFixed(2)}&note=${encodeURIComponent(note)}`;
    });

    qrCodes.hidden = false;
    qrCodes.innerHTML = accounts.map((account, index) => {
      const qrUrl = `https://quickchart.io/qr?size=240&text=${encodeURIComponent(paymentUrls[index])}`;
      return `<div class="cashapp-qr"><h2>Send $${amounts[index].toFixed(2)} to ${account}</h2><img src="${qrUrl}" alt="Cash App QR code for ${account}"><a class="nav-link" href="${paymentUrls[index]}" target="_blank" rel="noopener">Open Cash App</a></div>`;
    }).join('') + (data.url ? `<a class="primary-btn" href="${data.url}">Continue to payment confirmation</a>` : '');

    if (cashAppWindow) {
      cashAppWindow.location.href = paymentUrls[0];
    } else if (paymentInstructions) {
      paymentInstructions.innerHTML += '<br>Allow pop-ups to open Cash App automatically, or use the links below.';
    }
  }

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

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const submitButton = document.getElementById('checkout-submit-button');
      const errorDiv = document.getElementById('checkout-errors');
      const name = document.getElementById('customer-name').value.trim();
      const age = Number(document.getElementById('customer-age').value);
      const email = document.getElementById('customer-email').value.trim();
      const shippingAddress = document.getElementById('shipping-address').value.trim();
      const smsConsent = document.getElementById('sms-consent').checked;
      const paymentMethod = document.getElementById('payment-method').value;

      if (!name || !email || !shippingAddress || !smsConsent || !Number.isInteger(age) || age < 1 || age > 120) {
        errorDiv.textContent = 'Please enter a valid name, age, email, and shipping address.';
        return;
      }

      submitButton.disabled = true;
      submitButton.innerHTML = 'Creating secure order...';
      errorDiv.textContent = '';
      const cashAppWindow = window.open('', 'lulu-ridge-cashapp');
      console.log('Starting checkout for', { name, email, paymentMethod, quantity, total, isSubscription, subscriptionType });

      try {
        if (isGithubPages) {
          const localData = {
            total,
            quantity,
            paymentCode: `WEB-${Date.now().toString(36).toUpperCase()}`,
            cashAppAccounts: FALLBACK_CASH_APP_ACCOUNTS,
          };
          if (paymentInstructions) {
            paymentInstructions.innerHTML = `<strong>Amount:</strong> $${total.toFixed(2)}<br><strong>Payment code:</strong> ${localData.paymentCode}<br>Cash App opened in a new tab. Scan both QR codes to send the 50/50 split. SMS notifications require the bakery server to be online.`;
          }
          renderCashAppPayments(localData, cashAppWindow);
          submitButton.textContent = 'Pay';
          return;
        }

        const response = await fetch(`${apiBaseUrl}/api/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quantity,
            customerName: name,
            customerAge: age,
            customerEmail: email,
            shippingAddress,
            smsConsent,
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

        renderCashAppPayments(data, cashAppWindow);

        submitButton.textContent = 'Pay';
      } catch (error) {
        console.error('Checkout error:', error);
        errorDiv.textContent = error.message || 'Checkout is unavailable right now.';
        submitButton.disabled = false;
        submitButton.textContent = 'Pay';
      }
    });
  }
});
