# Auvra — Full Starter E-commerce

## Included
- Customer signup/login
- Admin login
- Product database (SQLite)
- Admin product add/delete
- Cart
- Checkout with Cash on Delivery
- Customer order history
- Admin order list + status
- Responsive website

## Run locally
1. Install Node.js 18+.
2. Open this folder in a terminal.
3. Run: `npm install`
4. Set a strong admin password before real use:
   - Windows PowerShell: `$env:ADMIN_PASSWORD="your-strong-password"`
   - Linux/macOS: `export ADMIN_PASSWORD="your-strong-password"`
5. Run: `npm start`
6. Open `http://localhost:3000`

Default admin email is `admin@auvra.com`. Change `ADMIN_EMAIL` and `ADMIN_PASSWORD` for real deployment.

## Production steps still requiring your accounts
- Hosting/server account
- Domain
- HTTPS
- Real payment gateway credentials (Razorpay/Stripe/etc.)
- SMS/email provider credentials
- Shipping/courier integration
- Production database backups and secrets

The included checkout is COD only. Do not treat this starter as production-ready until authentication, secrets, validation, rate limiting, backups, HTTPS and payment verification are configured.
