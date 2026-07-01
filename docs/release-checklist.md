# Release Checklist

## Account And Platform

- Mini Program is certified.
- WeChat Pay merchant account is approved and bound to the Mini Program AppID.
- Service categories match the actual water, beverage, and daily goods business.
- Required food, beverage, or retail qualifications are uploaded if the platform asks for them.

## Cloud Environment

- Cloud environment is created and selected in WeChat DevTools.
- Collections are created: `shop_config`, `categories`, `products`, `orders`, `payments`, `refunds`, `users`, `admins`.
- Seed shop configuration, categories, and initial products are inserted.
- Administrator OpenID is inserted into `admins` with `enabled: true`.
- Database permissions follow [security-rules.md](./security-rules.md).

## Payment And Callbacks

- `WX_CLOUD_ENV_ID` is configured for cloud functions.
- `WX_PAY_SUB_MCH_ID` is configured for cloud functions.
- `api`, `payNotify`, `refundNotify`, and `platformNotify` cloud functions are deployed.
- Payment callback URL or CloudPay callback binding reaches `payNotify`.
- Refund callback binding reaches `refundNotify`.
- Platform message push or cloud function binding reaches `platformNotify`.

## Subscription And Shipping

- `NEW_ORDER_TEMPLATE_ID` is configured for cloud functions.
- `shop_config.templateIds.newOrder` stores the same template ID used by the admin page.
- Admin users tap “开启新订单提醒” in the merchant dashboard.
- Order shipping management service is confirmed with `/wxa/sec/order/is_trade_managed`.
- Shipping upload succeeds, or manual upload fallback is documented for the merchant.

## Real-Device Acceptance

- User opens the shop from a share card.
- User creates an order.
- A real low-value payment succeeds.
- Payment callback changes the order to paid and waiting delivery.
- Admin receives a new order notice after accepting subscription permission.
- Admin starts delivery.
- Shipping upload status is visible in the admin order detail.
- Admin completes the order.
- A real low-value refund succeeds.
- Refund callback changes the order to refunded.
- Non-admin users cannot open admin pages or call admin APIs.

## Operational Checks

- Tencent Cloud or Cloud Development budget alerts are configured.
- Product images are compressed before being shown in the storefront.
- Logs are checked after payment, refund, and platform message tests.
- Current `main` branch is pushed to GitHub before release.
- Rollback point is known: deploy the previous Git commit and previous cloud function versions if release validation fails.
