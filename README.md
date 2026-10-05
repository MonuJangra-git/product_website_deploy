# NovaMart - Production-Ready Next.js E-Commerce Starter

NovaMart is a full-stack e-commerce application built with **Next.js (App Router)**, **PostgreSQL**, and **Drizzle ORM**. It includes customer shopping, payments, delivery management, administration, monitoring, and Docker-based deployment support.

---

## Deployment and Operations

My role in this project focuses on deploying, operating, and documenting the application. Responsibilities include:

- Deploying the source code to the server and dockerising the application
- Creating Grafana dashboards and configuring monitoring with Prometheus and cAdvisor
- Writing Docker Compose and other YAML configuration files for deployment and monitoring
- Maintaining project documentation for setup, operations, and troubleshooting
- Managing CI/CD with Jenkins and related deployment configuration
- Improving the platform so the deployment is scalable, reliable, and secure

This work covers the infrastructure and operational practices required to run and maintain the e-commerce application reliably.

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
cp .env.example .env  # edit values before starting the application
npm install
npx drizzle-kit push         # create tables
npm run build && npm start   # http://localhost:3000
```

Products and the default admin user (`admin@store.local` / `admin123`) are seeded automatically on the first request. Override the credentials with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### Environment configuration

Copy `.env.example` to `.env` and update the values for your environment. Do not commit `.env` or share it because it contains database, administrator, payment, email, and monitoring credentials.

The main application variables are:

| Purpose | Variables |
|---------|-----------|
| Database | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| Store and public URL | `STORE_NAME`, `STORE_CURRENCY`, `TAX_PERCENT`, `SUPPORT_EMAIL`, `ENABLE_COD`, `SITE_URL`, `SESSION_SECRET` |
| Initial administrator | `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| Payment gateways | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `STRIPE_SECRET_KEY` |
| Alert email delivery | `SENDERS_MAIL`, `SENDERS_EMAIL_PASSWORD`, `ALERT_RECEIVER_EMAIL` |

The monitoring stack additionally uses `GRAFANA_URL`, `GF_SECURITY_ADMIN_USER`, and `GF_SECURITY_ADMIN_PASSWORD`. The default Grafana URL inside the Compose network is `http://grafana:3000`; use the URL that Grafana should advertise when changing it.

---

## Docker

```bash
docker compose up -d postgres                     # start the database
docker compose up -d --build web                  # build and start the application
docker compose run --rm web sh -lc "npx drizzle-kit push"  # push schema + seed
docker compose restart web                        # restart the application
```

The application is available at `http://localhost:3000`.

---

## LAN / Private IP Testing

```bash
SITE_URL=http://192.168.1.20:3000 npm start -- -H 0.0.0.0 -p 3000
```

Or leave `SITE_URL` empty and set it in **Admin → Settings → Public Store URL**.

---

## Payment Gateways

Add the required keys to `.env`, then restart the application. No code changes are required.

| Gateway  | Environment Variables |
|----------|-----------------------|
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| PayPal   | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` |
| Stripe   | `STRIPE_SECRET_KEY` |
| COD      | `ENABLE_COD=true` or toggle in admin settings |

> PayPal and Stripe redirect back to `SITE_URL`. Browser geolocation requires `https` or `localhost`.

Once the gateway variables are configured, the payment methods are enabled automatically after the application starts or restarts. Their status can be checked from the admin interface.

---

## Production Checklist

1. Set a strong `SESSION_SECRET` and change the admin password
2. Set `SITE_URL` to the public `https` URL and place the application behind a TLS proxy such as Nginx or Caddy
3. Use live gateway keys (`rzp_live_…`, `sk_live_…`, `PAYPAL_MODE=live`)
4. Configure delivery zones and currency in **Admin → Settings**

---

## Jenkins Setup

Before running the local Jenkins pipeline, use [`permission_on.sh`](permission_on.sh) to give the Jenkins service access to its home, workspace, and Docker. The script must be run with `sudo` and expects a Jenkins user to already exist. Configure the Jenkins values in your local `.env` file before running it:

```bash
cp .env.example .env
```

```dotenv
JENKINS_USER=jenkins
JENKINS_HOME=/var/lib/jenkins
JENKINS_PIPELINE_NAME=project-pipeline
JENKINS_WORKSPACE_DIR=/var/lib/jenkins/workspace/project-pipeline
SECRET_FILE_NAME=prod-env
```

`SECRET_FILE_NAME` is the Jenkins Secret file credential ID used by both pipelines. It defaults to `prod-env`; if you use a different credential ID, update this value in `.env` and in the Jenkins pipeline configuration.

Run the permission script from the project root:

```bash
sudo ./permission_on.sh
```

It verifies the Jenkins user, creates the configured workspace, enables Docker, adds Jenkins to the Docker group, restarts Jenkins, and checks Docker access as the Jenkins user. Keep `.env` out of source control.

## CI/CD with Jenkins

The Jenkins pipelines are stored in the [`Jenkiens/`](Jenkiens/) directory and are intended for Jenkins installed on the same Linux machine as Docker. Use them in this order:

1. [`Jenkiens/Jenkinsfile.init`](Jenkiens/Jenkinsfile.init) for the first pipeline run and initial application setup
2. [`Jenkiens/Jenkinsfile.main`](Jenkiens/Jenkinsfile.main) only after the initialization pipeline completes successfully, for subsequent automated website updates

Both pipelines:

1. Checks out the `main` branch
2. Loads `.env` from a Jenkins Secret file credential into the workspace for the build
3. Verifies the Docker Compose configuration
4. Builds and starts the `web` container
5. Deletes `.env` from the workspace after the build

`Jenkinsfile.init` additionally starts PostgreSQL and pushes the Drizzle database schema before starting the application for the first time. `Jenkinsfile.main` is the lighter recurring deployment pipeline: use it for automated updates after the initial database and application setup has succeeded.

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

The `.env` file is uploaded to Jenkins as a credential, so it does not need to be stored in the repository or copied from a fixed host path.

### Start Jenkins locally

Get the initial administrator password and open Jenkins in a browser:

```bash
sudo systemctl status jenkins
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Open [http://localhost:8080](http://localhost:8080), unlock Jenkins with the displayed password, install the suggested plugins, and create an administrator account.

### Create the initial pipeline

1. Create a `.env` file on your local system from `.env.example`, then fill in the values required by the application:

  ```bash
  cp .env.example .env
  ```

2. In Jenkins, open **Manage Jenkins → Credentials**, select the appropriate credential store (usually **System → Global credentials**), and choose **Add Credentials**.
3. Set **Kind** to **Secret file**, upload the `.env` file created locally, and set its **ID** to the value of `SECRET_FILE_NAME` (default: `prod-env`). Do not commit this file to Git.
4. Create a **Pipeline** job from **New Item**, then open its **Pipeline** section.
5. Set **Definition** to **Pipeline script**.
6. Copy the complete contents of [`Jenkiens/Jenkinsfile.init`](Jenkiens/Jenkinsfile.init), or select this pipeline file if your Jenkins setup supports loading it from source control, and paste the script into the Jenkins pipeline editor.
7. Select **Save**, then **Build Now**.

The pipeline reads the credential ID from `SECRET_FILE_NAME`, copies the credential to `.env` only while the build is running, and removes it in the `post` cleanup step.

### Configure automated updates after initialization

After the initial [`Jenkinsfile.init`](Jenkiens/Jenkinsfile.init) run finishes successfully, update the Jenkins job to use [`Jenkiens/Jenkinsfile.main`](Jenkiens/Jenkinsfile.main). Do not use `Jenkinsfile.main` as the first run: it assumes the initial setup has already completed. Configure the job to run on your desired trigger, such as a GitHub webhook or a scheduled poll, so changes pushed to `main` automatically rebuild and restart the website container.

---

## Monitoring

The monitoring stack uses the following services:

- **Prometheus** – metrics collection
- **cAdvisor** – container metrics
- **Node Exporter** – host/server metrics  
- **Grafana** – visualization dashboards

Start the monitoring stack from the project root with:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

The repository uses `docker-compose.monitoring.yml` as the monitoring Compose file. It reads `GRAFANA_URL`, `GF_SECURITY_ADMIN_USER`, and `GF_SECURITY_ADMIN_PASSWORD` from `.env`. After the containers start, open Grafana at `http://localhost:3001`, sign in with the configured credentials, and open the provisioned dashboards from **Dashboards**. Change the example Grafana password before using the monitoring stack outside local development.

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

### Included Dashboards

| Dashboard | Description |
|-----------|-------------|
| `server-monitoring.json` | CPU, Memory, Disk, Network, Load Average, Uptime |
| `container-monitoring.json` | Container CPU, Memory, Network, Disk I/O, Processes |

### Provisioning Configuration

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

## Monitoring Troubleshooting

### Issue 1: Dashboards Rejected by the Grafana File Provisioner

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

### Issue 2: Datasource UID Mismatch (404 / No Data)

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

> **Silent failure:** Grafana loads the dashboard successfully, but all panels are empty because the queries cannot resolve the datasource.

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

### Issue 3: Missing `apiVersion` in `datasource.yml`

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

### Issue 4: cAdvisor CPU Mountpoint Error

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

### Verify the Monitoring Stack
```bash
# Check datasource loaded with correct UID
curl -s -u "$GF_SECURITY_ADMIN_USER:$GF_SECURITY_ADMIN_PASSWORD" http://localhost:3001/api/datasources \
  | python3 -m json.tool | grep -E "uid|name"

# Check dashboards provisioned
curl -s -u "$GF_SECURITY_ADMIN_USER:$GF_SECURITY_ADMIN_PASSWORD" "http://localhost:3001/api/search?type=dash-db" \
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
- [x] Dockerized deployment and operational documentation
- [ ] SSL/TLS setup for secure HTTPS access
- [ ] Configure a production domain for the website
- [ ] Automated image and container updates (`Jenkiens/Jenkinsfile.main`)
- [ ] Continued scalability, reliability, and security improvements
- [ ] Documentation with screenshots and demo video (`/proofs`)

---

## Contact

For questions, suggestions, or contributions, contact **jangramonu908@gmail.com**.
