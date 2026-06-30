# Deployment

Create these cloud database collections before first release:

- `shop_config`
- `categories`
- `products`
- `orders`
- `payments`
- `refunds`
- `users`
- `admins`

After running the `getSession` action in development, create an `admins` record for the merchant administrator:

```json
{
  "openId": "merchant-openid-from-getSession",
  "enabled": true
}
```

## WeChat Pay

Configure these cloud function environment variables in WeChat DevTools or Cloud Development console:

- `WX_CLOUD_ENV_ID`: cloud environment id used by payment callbacks.
- `WX_PAY_SUB_MCH_ID`: merchant id associated with the mini program.

Use CloudPay first. If the account cannot use CloudPay, replace `cloud.cloudPay.unifiedOrder` with WeChat Pay v3 direct API calls inside `cloudfunctions/api/lib/payments.js` and keep the frontend `createPayment` response shape unchanged.
