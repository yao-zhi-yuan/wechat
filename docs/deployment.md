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

## Subscription Templates

Configure cloud function environment variable `NEW_ORDER_TEMPLATE_ID` with the template selected in WeChat public platform. Store the same template ID in `shop_config.templateIds.newOrder` so the admin page can request subscription permission before cloud functions send messages.
Admin users must tap “开启新订单提醒” in the merchant dashboard before receiving messages.

## Platform Message Push

Configure WeChat Mini Program message push URL or cloud function binding so order shipping events reach `platformNotify`.
Track these events in logs: `trade_manage_remind_access_api`, `trade_manage_remind_shipping`, `trade_manage_order_settlement`, `wxa_trade_controlled`.
