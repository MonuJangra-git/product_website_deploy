# NovaMart – production-ready Next.js e-commerce starter

Full-stack store built with Next.js (App Router), PostgreSQL and Drizzle ORM.

## Features
- Catalogue with search, categories, sorting, product pages (6 real products pre-seeded)
- Cart (persisted in the browser), checkout with server-side price validation and stock control
- **Delivery location**: saved addresses, "use my current location" (GPS + reverse geocoding), configurable delivery zones & rates, free-shipping thresholds, store pickup
- **Payments driven by environment variables** – Razorpay, PayPal and Stripe switch on automatically when their keys exist; Cash on Delivery as fallback
- Customer accounts (register / login / order history / addresses) and guest checkout
- Admin panel: orders (status + payment updates), products CRUD, store settings (name, currency, tax, COD, pickup, delivery zones, public URL)
- Order tracking page
- Runs over **http or https**, on localhost, a private/LAN IP or a domain – no HTTPS assumptions anywhere (cookies are only marked `secure` when the request is HTTPS)

## Quick start
```bash
cp .env.example .env         # edit values
npm install
npx drizzle-kit push         # create tables
npm run build && npm start   # http://localhost:3000
```
Products and the admin user (`admin@store.local` / `admin123`, change via `ADMIN_EMAIL` / `ADMIN_PASSWORD`) are seeded automatically on first request.

### Run with Docker
Start the database container first, push the Drizzle schema and initial parameters, then start the website container:

```bash
docker compose up postgres    # start the db container 
docker compose exec web sh npx drizzle-kit push # add tables and initial db parameters like admin details 
docker compose up -d    # start the app container 
```

The website is available at http://localhost:3000.

### Run on a private IP (LAN testing)
```bash
SITE_URL=http://192.168.1.20:3000 npm start -- -H 0.0.0.0 -p 3000
```
Or leave `SITE_URL` empty and set **Admin → Settings → Public store URL** to your address. This URL is used for payment gateway return URLs.

### Enabling payment gateways
Add the keys to `.env` (or your host's environment) and restart – nothing else is needed:

| Gateway  | Variables                                                     |
|----------|---------------------------------------------------------------|
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`                      |
| PayPal   | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`     |
| Stripe   | `STRIPE_SECRET_KEY`                                           |
| COD      | `ENABLE_COD=true` (or toggle in admin settings)               |

> PayPal/Stripe redirect the customer back to `SITE_URL` – on a private IP use `http://<ip>:<port>`; both work with plain http for sandbox/test mode. Browser geolocation only works over https or `localhost` (browser restriction).

## Going live checklist
1. Set a strong `SESSION_SECRET`, change the admin password.
2. Set `SITE_URL` to your public https URL and put the app behind a TLS-terminating proxy (nginx/Caddy) – the app reads `x-forwarded-proto`/`x-forwarded-host`.
3. Use live gateway keys (`rzp_live_…`, `sk_live_…`, `PAYPAL_MODE=live`).
4. Configure delivery zones and currency in Admin → Settings.

## Next Goals 
1. Add monitoring Section 
2. Make a CI/CD pipeline using jenkiens 
3. Design it to make it more simple to deploy , scalable and reliable .
 
## Note 
1. If this repo helps someone , give a star to this repo .
2. If someone wants to make some changes or advice to add more features , then mail me.

## Contact 
 email=jangramonu908@gmail.com

