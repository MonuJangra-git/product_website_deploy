# NovaMart – Production-Ready Next.js E-Commerce Starter

Full-stack store built with **Next.js (App Router)**, **PostgreSQL** and **Drizzle ORM**.

---

## Features
- Catalogue with search, categories, sorting and product pages (6 products pre-seeded)
- Cart (browser-persisted), checkout with server-side price validation and stock control
- **Delivery**: saved addresses, GPS + reverse geocoding, delivery zones & rates, free-shipping thresholds, store pickup
- **Payments via environment variables** – Razorpay, PayPal and Stripe activate automatically when keys exist; Cash on Delivery as fallback
- Customer accounts (register / login / order history / addresses) and guest checkout
- Admin panel: orders, products CRUD, store settings (name, currency, tax, COD, pickup, delivery zones, public URL)
- Order tracking page
- Runs over **http or https** – cookies are only marked `secure` when the request is HTTPS

---

## Quick Start

```bash
cp .env.example .env         # edit values
npm install
npx drizzle-kit push         # create tables
npm run build && npm start   # http://localhost:3000
```

Products and admin user (`admin@store.local` / `admin123`, override via `ADMIN_EMAIL` / `ADMIN_PASSWORD`) are seeded automatically on first request.

---

## Docker

```bash
docker compose up postgres                        # start database
docker compose exec web sh npx drizzle-kit push  # push schema + seed
docker compose up -d                              # start app
```

Available at `http://localhost:3000`

---

## LAN / Private IP Testing

```bash
SITE_URL=http://192.168.1.20:3000 npm start -- -H 0.0.0.0 -p 3000
```

Or leave `SITE_URL` empty and set it in **Admin → Settings → Public Store URL**.

---

## Payment Gateways

Add keys to `.env` and restart — nothing else needed:

| Gateway  | Environment Variables |
|----------|-----------------------|
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| PayPal   | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` |
| Stripe   | `STRIPE_SECRET_KEY` |
| COD      | `ENABLE_COD=true` or toggle in admin settings |

> PayPal/Stripe redirect back to `SITE_URL`. Browser geolocation requires `https` or `localhost`.

---

## Going Live Checklist

1. Set a strong `SESSION_SECRET` and change the admin password
2. Set `SITE_URL` to your public `https` URL and put the app behind a TLS proxy (nginx/Caddy)
3. Use live gateway keys (`rzp_live_…`, `sk_live_…`, `PAYPAL_MODE=live`)
4. Configure delivery zones and currency in **Admin → Settings**

---

## Monitoring (Grafana + Prometheus + cAdvisor)

The stack includes a monitoring setup using:

- **Prometheus** – metrics collection
- **cAdvisor** – container metrics
- **Node Exporter** – host/server metrics  
- **Grafana** – visualization dashboards

Start the monitoring stack with:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

Grafana is available at `http://localhost:3001`.

### Dashboards Included

| Dashboard | Description |
|-----------|-------------|
| `server-monitoring.json` | CPU, Memory, Disk, Network, Load Average, Uptime |
| `container-monitoring.json` | Container CPU, Memory, Network, Disk I/O, Processes |

### Provisioning Setup

```
monitoring/grafana/
├── dashboards/
│   ├── server-monitoring.json
│   └── container-monitoring.json
└── provisioning/
    ├── dashboards/
    │   └── dashboards.yml
    └── datasource.yml
```

### `datasource.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus-uid
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: "15s"
      httpMethod: POST
```

### `dashboards.yml`

```yaml
apiVersion: 1

providers:
  - name: default
    type: file
    updateIntervalSeconds: 10
    options:
      path: /var/lib/grafana/dashboards
```

---

## Troubleshooting – Monitoring Setup

### Issue 1 – Dashboards Rejected by Grafana File Provisioner

**Error:**
```
dashboard appears to be in v2 format.
Please use the /apis/dashboard.grafana.app/v2 API
```

**Cause:**  
Dashboard JSON files were exported in **Grafana API v2 format**.  
The file provisioner only accepts the **classic dashboard format**.

**Fix:**  
Convert dashboards to classic format. Classic format structure:
```json
{
  "title": "Dashboard Title",
  "panels": [...],
  "templating": { "list": [] },
  "time": { "from": "now-1h", "to": "now" },
  "schemaVersion": 36
}
```
> Do not use the v2 scene-based export from Grafana UI. Use **Dashboard Settings → JSON Model** instead.

---

### Issue 2 – Datasource UID Mismatch (404 / No Data)

**Error:**
```
Datasource not found
Unknown Datasource: cfz7mubuj92ioc
```

**Cause:**  
Dashboard JSON references datasource by UID but provisioned datasource has no UID defined or has a mismatched generated UID.

**Error Type:**

| Property | Value |
|----------|-------|
| Error Type | Datasource UID Resolution Error |
| Error Class | Configuration / Provisioning Error |
| HTTP Status | 404 Not Found |
| Severity | High – No data shown in any panel |
| Visible In | Grafana UI + Logs + Browser Console |

> 🔴 **Silent Error** – Grafana loads the dashboard successfully but all panels are empty because queries cannot resolve the datasource.

**Fix:**  
Add a matching `uid` to `datasource.yml`:
```yaml
datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus-uid    # must match uid used in dashboard JSON
```

And update all panel datasource references in dashboard JSON:
```json
"datasource": {
  "type": "prometheus",
  "uid": "prometheus-uid"
}
```

---

### Issue 3 – Missing `apiVersion` in `datasource.yml`

**Cause:**  
`datasource.yml` was missing `apiVersion: 1`, causing Grafana to not reliably apply datasource settings.

**Fix:**  
Always include `apiVersion: 1` at the top of `datasource.yml`:
```yaml
apiVersion: 1   # required

datasources:
  - name: Prometheus
  ...
```

---

### Issue 4 – cAdvisor CPU Mountpoint Error

**Error:**
```
Failed to create a Container Manager: mountpoint for cpu not found
```

**Cause:**  
System uses **cgroup v2** but old `google/cadvisor` image does not support it.

**Fix:**
```yaml
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest   # use maintained image
  privileged: true
  devices:
    - /dev/kmsg:/dev/kmsg
```

---

### Verify Monitoring Stack

```bash
# Check datasource loaded with correct UID
curl -s -u admin:admin123 http://localhost:3001/api/datasources \
  | python3 -m json.tool | grep -E "uid|name"

# Check dashboards provisioned
curl -s -u admin:admin123 "http://localhost:3001/api/search?type=dash-db" \
  | python3 -m json.tool | grep title

# Check Grafana logs
docker logs grafana 2>&1 | grep -E "provision|error|dashboard"
```

**Expected output:**
```text
finished to provision dashboards
```

---

## Roadmap

- [x] Core e-commerce features
- [x] Monitoring (Grafana + Prometheus + cAdvisor)
- [ ] CI/CD pipeline (Jenkins)
- [ ] Simplified deployment – scalable and reliable
- [ ] Documentation with screenshots and demo video (`/proofs`)

---

## Contact

If this repo helped you, consider giving it a ⭐  
For suggestions or contributions → **jangramonu908@gmail.com**