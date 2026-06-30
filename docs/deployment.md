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
