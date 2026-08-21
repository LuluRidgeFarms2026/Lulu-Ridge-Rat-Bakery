# Lulu-Ridge-Rat-Bakery
I make homemade rat treats. No added sugars, all safe ingredients.

## Cash App setup

The payment page splits each order between two Cash App accounts and displays a QR code for each half. Set both handles in the server environment before accepting payments:

```text
CASHAPP_ACCOUNT_ONE=@first-account
CASHAPP_ACCOUNT_TWO=@second-account
```

Keep the handles without spaces. The Node server uses these values for the QR codes; the GitHub Pages fallback uses the two default handles shown above.

## Order notifications

Orders can text the shipment quantity and address to `501-757-3635` through Twilio. Configure these server-only variables before enabling SMS:

```text
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=your-twilio-number
ORDER_NOTIFICATION_NUMBER=+15017573635
```

Cash App still requires the customer to approve each payment. The payment links prefill the correct amount and order code; the shipping address is sent only by the server SMS notification and is not placed in the QR code.
