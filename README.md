# Lulu-Ridge-Rat-Bakery
I make homemade rat treats. No added sugars, all safe ingredients.

## Cash App setup

The payment page splits each order between two Cash App accounts and displays a QR code for each half. Set both handles in the server environment before accepting payments:

```text
CASHAPP_ACCOUNT_ONE=@first-account
CASHAPP_ACCOUNT_TWO=@second-account
```

Keep the handles without spaces. The page will not show payment QR codes until both values are configured.
