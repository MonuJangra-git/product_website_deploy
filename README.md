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
docker compose up -d --build web                  
docker compose run --rm web sh -lc "npx drizzle-kit push"  # push schema + seed
docker compose  restart web                            # start app
# from here you work is done , website is started .
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
Note:- Just add the variables in payment gateways , then start (if 1st time) and restart the containers , Payment gateways added automatically , admin can check it also on webpage.

---

## Going Live Checklist

1. Set a strong `SESSION_SECRET` and change the admin password
2. Set `SITE_URL` to your public `https` URL and put the app behind a TLS proxy (nginx/Caddy)
3. Use live gateway keys (`rzp_live_…`, `sk_live_…`, `PAYPAL_MODE=live`)
4. Configure delivery zones and currency in **Admin → Settings**

---

## Jenkins Permission Setup

Before running the local Jenkins pipeline, use [`permission_on.sh`](permission_on.sh) to give the Jenkins service access to its home, workspace, and Docker. The script must be run with `sudo` and expects a Jenkins user to already exist.

### Configure the pipeline name

Copy the example environment file and set the Jenkins values near the bottom of `.env`:

```bash
cp .env.example .env
```

```dotenv
JENKINS_USER=jenkins
JENKINS_HOME=/var/lib/jenkins
JENKINS_PIPELINE_NAME=project-pipeline
JENKINS_WORKSPACE_DIR=/var/lib/jenkins/workspace/project-pipeline
```

Run the permission script from the project root before starting or building the Jenkins job:

```bash
sudo ./permission_on.sh
```

The script reads these Jenkins settings from `.env`. You can also override the pipeline name for one run:

```bash
sudo ./permission_on.sh another-pipeline
```

It verifies the Jenkins user, creates the configured workspace, enables Docker, adds Jenkins to the Docker group, restarts Jenkins, and checks Docker access as the Jenkins user.

## CI/CD with Jenkins

The current local Jenkins pipeline is stored in [`Jenkiens/Jenkinsfile`](Jenkiens/Jenkinsfile). It is intended for Jenkins installed on the same Linux machine as Docker. The pipeline:

1. Checks out the `main` branch
2. Copies `/home/Work_Docker/.env` into the workspace
3. Starts PostgreSQL with Docker Compose
4. Builds and starts the `web` container
5. Pushes the Drizzle database schema
6. Restarts the Compose services

### Jenkins prerequisites

Install Java, Jenkins, Docker Engine and the Docker Compose plugin on the host. On Debian or Ubuntu, the Jenkins installation can be started with:

```bash
sudo apt update
sudo apt install -y fontconfig openjdk-21-jre
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
  | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install -y jenkins
sudo systemctl enable --now jenkins
```

Give the Jenkins service permission to run Docker, then restart Jenkins:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
docker --version
docker compose version
```

The file `/home/Work_Docker/.env` must already exist on the Jenkins host and be readable by the Jenkins service. Update the path in the Jenkinsfile if the environment file is stored elsewhere.

### Start Jenkins locally

Get the initial administrator password and open Jenkins in a browser:

```bash
sudo systemctl status jenkins
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Open [http://localhost:8080](http://localhost:8080), unlock Jenkins with the displayed password, install the suggested plugins, and create an administrator account.

### Create the local pipeline

1. Select **New Item**, enter a job name, choose **Pipeline**, and select **OK**.
2. In the **Pipeline** section, set **Definition** to **Pipeline script**.
3. Copy the complete contents of [`Jenkiens/Jenkinsfile`](Jenkiens/Jenkinsfile) and paste it into the Jenkins pipeline editor.
4. Select **Save**, then **Build Now**.

The Jenkinsfile currently contains no syntax error. If Jenkins reports a pipeline syntax error, copy the complete current file into the pipeline editor again, rather than copying only individual stages.

### Jenkinsfile compatibility note

The pipeline uses `docker compose` for startup but currently uses the older `docker-compose restart` command in its final stage. If the Jenkins host does not provide the hyphenated `docker-compose` command, that stage will fail at runtime; change it to `docker compose restart` in the Jenkinsfile and paste the updated complete file into the Jenkins editor. This is a Docker CLI compatibility issue, not a Jenkins syntax issue.

This local pipeline does not automatically publish images or manage a separate production container deployment. A future `Jenkiens/Jenkinsfile.main` will handle automatic image and container updates when it is added.

---

## Monitoring (Grafana + Prometheus + cAdvisor)

The stack includes a monitoring setup using:

- **Prometheus** – metrics collection
- **cAdvisor** – container metrics
- **Node Exporter** – host/server metrics  
- **Grafana** – visualization dashboards

If you want to monitor the server and Docker containers, start the monitoring stack from the project root with:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

The repository uses `docker-compose.monitoring.yml` as the monitoring Compose file. After the containers start, open Grafana at `http://localhost:3001`, sign in with the configured default credentials (`admin` / `admin123`), and open the provisioned dashboards from **Dashboards**.

Monitoring service URLs:

| Service | URL | Purpose |
|---------|-----|---------|
| Grafana | `http://localhost:3001` | View server and container dashboards |
| Prometheus | `http://localhost:9090` | Query collected metrics |
| cAdvisor | `http://localhost:8080` | Inspect Docker container metrics |
| Node Exporter | `http://localhost:9100` | Expose host/server metrics |
| Alertmanager | `http://localhost:9093` | View configured alerts |

Check the monitoring containers with:

```bash
docker compose -f docker-compose.monitoring.yml ps
```

Stop the monitoring stack when it is no longer needed:

```bash
docker compose -f docker-compose.monitoring.yml down
```

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
- [x] Local CI/CD pipeline (Jenkins)
- [ ] Automated image and container updates (`Jenkiens/Jenkinsfile.main`)
- [ ] Simplified deployment – scalable and reliable
- [ ] Documentation with screenshots and demo video (`/proofs`)

---

## Contact

If this repo helped you, consider giving it a ⭐  
For suggestions or contributions → **jangramonu908@gmail.com**