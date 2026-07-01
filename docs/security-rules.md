# Security Rules

Apply restrictive database permissions before release.

## Collection Access

- `products`, `categories`, `shop_config`: public read, no direct client write.
- `orders`: no direct public read or write; access through the `api` cloud function.
- `payments`, `refunds`, `admins`, `users`: no direct public read or write; access through the `api` cloud function.

All mutations are performed by cloud functions after OpenID and admin checks.

## Required Controls

- Keep WeChat Pay merchant IDs, payment secrets, API certificates, AppSecret, and subscription template configuration out of mini program frontend code.
- Keep admin authorization in the `admins` collection and enforce it in cloud functions, even if admin pages are hidden in the client.
- Store all money values in fen and never trust client-submitted totals as final payable amounts.
- Treat payment, refund, and platform callbacks as idempotent.
- Do not let users update order status, payment status, refund status, delivery status, or admin settings directly from the client.
- Allow product catalogue reads for shoppers, but route product writes through admin cloud actions.

## Suggested Cloud Database Rules

Use these as the intended policy when configuring Cloud Development database permissions:

```text
products, categories, shop_config:
  read: true
  write: false

orders, payments, refunds, admins, users:
  read: false
  write: false
```

If Cloud Development requires JSON rule syntax in the console, translate the same policy into the console rule editor format for each collection.
