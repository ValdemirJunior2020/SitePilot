# SitePilot

**Website Intelligence & Monitoring Platform**

SitePilot is a full-stack website monitoring app for tracking public web pages over time. Users can register with Firebase Authentication, add websites, run secure Puppeteer scans, review before/after changes, inspect screenshot history, follow an activity timeline, and generate a weekly intelligence report.

## What is included

- React + Vite client in `client/`
- Node.js + Express API in `server/`
- Firebase Authentication with email/password and Google sign-in
- Firestore data model scoped to `users/{uid}/sites/{siteId}/scans/{scanId}`
- Firebase Admin token verification on every private API route
- Website CRUD
- Secure Puppeteer scanning with DNS/private-network blocking and redirect/request guarding
- Title, description, H1, visible text, canonical URL, status, links, images, headings, hashes, duration, and screenshots
- Change detection with a 0–100 score and severity
- Scan history and individual before/after scan detail pages
- Screenshot comparison
- Dashboard statistics and analytics charts
- Activity feed
- Weekly report with copy and print actions
- Optional Ollama analysis
- Optional in-process scheduled scans
- Firebase Storage screenshot support with a local development fallback
- Netlify and Render deployment configuration

## Architecture

```text
Browser / Netlify
  React + Firebase Auth
          |
          | Authorization: Bearer <Firebase ID token>
          v
Render / Node API
  Express -> Firebase Admin verifies token -> verified uid
          |
          +-> Firestore: users/{uid}/sites/{siteId}/scans/{scanId}
          +-> Puppeteer scanner
          +-> Firebase Storage screenshots (recommended in production)
          +-> Ollama (optional)
```

The API never trusts a `userId` supplied by the browser. It always uses the UID from `admin.auth().verifyIdToken()`.

## Requirements

- Node.js 20 or newer (Node 22 recommended)
- npm
- A Firebase project
- Firestore enabled
- Firebase Authentication enabled
- A Firebase service account for the server
- Optional: Firebase Storage for persistent screenshot history
- Optional: Ollama for local AI analysis

## 1. Firebase setup

This project is already configured on the client for Firebase project `quizzhp-3729a` using its public web configuration.

In Firebase Console:

1. Open **Authentication** -> **Sign-in method**.
2. Enable **Email/Password**.
3. Enable **Google**.
4. Add `localhost` and your final Netlify domain to **Authentication -> Settings -> Authorized domains** when needed.
5. Create a **Cloud Firestore** database.
6. Deploy the root `firestore.rules` file.
7. Recommended: enable **Firebase Storage** for persistent screenshots.

The included Firestore rules allow a signed-in browser to read only its own path. Browser writes are denied because all application writes go through the verified Node API using Firebase Admin.

### Deploy Firestore rules with Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use quizzhp-3729a
firebase deploy --only firestore:rules
```

If this repository is not initialized with Firebase CLI yet, run `firebase init firestore`, select the existing project, and point the rules file to `firestore.rules`.

## 2. Firebase Admin credentials

Create or use a Firebase service account in Firebase Console / Google Cloud IAM. Put the values only in `server/.env` or Render environment variables.

Never commit a service-account JSON file or private key.

`server/.env`:

```env
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=quizzhp-3729a
FIREBASE_CLIENT_EMAIL=your-service-account@quizzhp-3729a.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=quizzhp-3729a.firebasestorage.app

CLIENT_URL=http://localhost:5173
PUBLIC_SERVER_URL=http://localhost:5000

OLLAMA_ENABLED=false
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

ENABLE_SCHEDULER=false
PUPPETEER_EXECUTABLE_PATH=
```

The server handles escaped private-key line breaks with:

```js
process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
```

## 3. Client environment

Copy the example:

```bash
cd client
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Local value:

```env
VITE_API_URL=http://localhost:5000
```

Only public browser values belong in `VITE_` variables. Never put Firebase Admin credentials in the client.

## 4. Run the server locally

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell:

```powershell
cd server
npm install
Copy-Item .env.example .env
npm run dev
```

Then open:

```text
http://localhost:5000/api/health
```

The health endpoint can start before Firebase Admin credentials are configured. Authenticated data endpoints require valid Admin credentials.

## 5. Run the client locally

In a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:5173
```

## Firestore structure

```text
users/{uid}
users/{uid}/sites/{siteId}
users/{uid}/sites/{siteId}/scans/{scanId}
```

A site stores monitoring configuration plus rolling counters such as `totalScans`, `totalChanges`, `totalCriticalChanges`, `lastStatus`, `lastScanAt`, and `lastChangeScore`.

A scan stores extracted page data, content hashes, a capped visible-text snapshot, change details, score/severity, screenshot URL, optional AI summary, and timing. Large base64 screenshots are never stored in Firestore.

## Screenshot storage

### Production: Firebase Storage

Set:

```env
FIREBASE_STORAGE_BUCKET=quizzhp-3729a.firebasestorage.app
```

The server uploads screenshots under:

```text
sitepilot/{uid}/{siteId}/{scanId}.png
```

The app stores only the download URL in Firestore. Deleting a monitored website also attempts to clean its screenshot folder.

### Development fallback

If `FIREBASE_STORAGE_BUCKET` is empty, screenshots are written under `server/screenshots/` and served from `/screenshots`. This is for local development only. Render's local filesystem is not appropriate for permanent historical screenshot storage.

## SSRF protection

SitePilot scans user-supplied public URLs, so the server includes multiple protections:

- only `http://` and `https://` are accepted
- localhost and internal hostnames are blocked
- direct private IPs are blocked
- DNS is resolved before navigation and private/internal results are rejected
- IPv4 private, loopback, link-local, carrier-grade NAT, documentation, multicast, and reserved ranges are blocked
- IPv6 loopback, unique-local, link-local, multicast, and documentation ranges are blocked
- Puppeteer request interception validates browser requests and redirects instead of trusting the initial URL only
- scans are rate-limited per authenticated UID
- navigation has timeouts
- browser/page cleanup happens in `finally`

This is a strong MVP guard for public-web monitoring. In a high-security enterprise deployment, add an outbound egress proxy/firewall that independently blocks private networks as a second layer.

## Change detection

The scanner normalizes whitespace and calculates SHA-256 hashes for visible text and normalized HTML. It compares each scan with the immediately previous scan and detects:

- title changes
- meta-description changes
- H1 changes
- HTTP status changes
- page unavailable/restored
- added/removed links
- visible text changes
- promotional/pricing/product-like content added or removed

Score bands:

```text
0-10   insignificant
11-30  minor
31-60  medium
61-80  important
81-100 critical
```

## Broken/unavailable pages

HTTP 4xx/5xx responses are stored as scan results. Public-network navigation failures such as connection errors/timeouts are also stored with status `0` where possible so availability changes can be detected later. Unsafe/internal navigation is rejected instead of being recorded as a normal scan.

## Optional Ollama

SitePilot works fully without Ollama.

Install Ollama separately, then for example:

```bash
ollama pull llama3.2
ollama serve
```

Set in `server/.env`:

```env
OLLAMA_ENABLED=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Important/medium-or-higher changes are sent to Ollama for a concise intelligence summary. If Ollama is down, the scan still succeeds and `aiSummary` stays empty.

## Optional scheduled scanning

The frequency field supports Manual, Every 6 hours, Every 12 hours, Daily, and Weekly.

Set:

```env
ENABLE_SCHEDULER=true
```

The server then checks every 15 minutes for due sites and scans them serially. For production workloads, a dedicated job/queue is better than an in-process timer. Also remember that a service that sleeps cannot run timers while asleep. Manual **Scan Now** always works independently of this option.

## API

```text
GET    /api/health
GET    /api/sites
POST   /api/sites
GET    /api/sites/:id
PUT    /api/sites/:id
DELETE /api/sites/:id
POST   /api/sites/:id/scan
GET    /api/sites/:id/scans
GET    /api/sites/:id/scans/:scanId
GET    /api/activity
GET    /api/dashboard
GET    /api/reports
```

Authenticated endpoints expect:

```http
Authorization: Bearer FIREBASE_ID_TOKEN
```

Responses use:

```json
{ "success": true, "data": {} }
```

or:

```json
{ "success": false, "error": "Human-readable message" }
```

## Netlify deployment (client)

Create a Netlify site from your repository.

Use:

```text
Base directory: client
Build command: npm run build
Publish directory: client/dist (or dist when Base directory is client)
```

Add one Netlify environment variable:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

`client/netlify.toml` includes the React Router SPA fallback so refreshing `/dashboard/sites/...` returns `index.html` instead of a 404.

After Netlify gives you the final URL, add that hostname to Firebase Authentication authorized domains and use the full origin as `CLIENT_URL` on Render.

## Render deployment (server)

Create a **Web Service** from the same repository.

Use:

```text
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

The included `server/render.yaml` has matching defaults.

Add these Render environment variables:

```env
NODE_ENV=production
FIREBASE_PROJECT_ID=quizzhp-3729a
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_STORAGE_BUCKET=quizzhp-3729a.firebasestorage.app
CLIENT_URL=https://YOUR-NETLIFY-SITE.netlify.app
PUBLIC_SERVER_URL=https://YOUR-RENDER-SERVICE.onrender.com
OLLAMA_ENABLED=false
ENABLE_SCHEDULER=false
```

`PORT` is supplied by Render and the app listens on `0.0.0.0`.

### Puppeteer on Render

The project uses the full `puppeteer` package. Puppeteer normally downloads a compatible Chrome during `npm install`, and Render documents Node/Puppeteer deployments on its native Node runtime.

If a build environment ever skips Puppeteer's browser-install script, change the build command to:

```bash
npm install && npx puppeteer browsers install chrome
```

If you provide a system Chrome yourself, set:

```env
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

The launch configuration already includes commonly needed container flags such as `--no-sandbox` and `--disable-dev-shm-usage`.

## CORS

Local server default:

```env
CLIENT_URL=http://localhost:5173
```

Production:

```env
CLIENT_URL=https://YOUR-NETLIFY-SITE.netlify.app
```

You can provide comma-separated origins if you intentionally need more than one frontend origin. Production CORS is not configured as `*`.

## Production security checklist

- Never commit `server/.env`.
- Never expose the Firebase Admin key to Vite/Netlify.
- Keep Firestore rules deployed.
- Keep Firebase Storage access policies appropriate for your project.
- Use Firebase Storage instead of Render local disk for persistent screenshots.
- Keep `CLIENT_URL` restricted to trusted frontend origins.
- Keep rate limiting enabled.
- Consider a dedicated outbound proxy/firewall for stronger SSRF defense at larger scale.
- Review the legal/robots/terms requirements for sites you choose to monitor.
- Move scheduled scans to a queue/worker architecture before scaling scan concurrency.

## Tests and verification

Server:

```bash
cd server
npm run check
npm test
npm start
```

Client:

```bash
cd client
npm run build
```

The ZIP intentionally excludes `node_modules`, `.env`, screenshot files, build output, logs, and service-account files.

## Troubleshooting

### `Firebase Admin is not configured`

Fill `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `server/.env` or Render.

### Google login says the domain is unauthorized

Add your Netlify hostname under Firebase Authentication -> Settings -> Authorized domains.

### CORS error after deployment

Make sure Render `CLIENT_URL` exactly matches the browser origin, including `https://` and without an extra path.

### Puppeteer says Chrome cannot be found

Run:

```bash
npx puppeteer browsers install chrome
```

Then redeploy. If using a custom Chrome install, set `PUPPETEER_EXECUTABLE_PATH`.

### Screenshots disappear on Render

Set `FIREBASE_STORAGE_BUCKET`. The local screenshot fallback is intentionally not permanent on ephemeral hosting.

### Ollama is unavailable

Leave `OLLAMA_ENABLED=false`, or confirm Ollama is running and the model in `OLLAMA_MODEL` has been pulled. This does not block normal scanning.
#   S i t e P i l o t  
 
## Price Watch (v2)

SitePilot now includes **Price Watch** without removing the original website-monitoring workflow.

A signed-in user can open **Price Watch → Add price watch** and enter a product name such as `32GB DDR5 Memory RAM`, a public product-page URL, an optional target price, check frequency, and alert email. Each price check uses Puppeteer, SSRF protections, structured product metadata/JSON-LD and common retailer price elements to find the live price. Checks are stored under `users/{uid}/priceWatches/{watchId}/checks/{checkId}`.

When `ENABLE_SCHEDULER=true`, the same scheduler that scans monitored websites also checks due price watches. If the price drops or reaches the target, SitePilot can send an email through Resend.

Add these server environment variables for email alerts:

```env
RESEND_API_KEY=re_your_key
EMAIL_FROM=SitePilot Alerts <alerts@your-verified-domain.com>
```

The `EMAIL_FROM` domain must be verified with your email provider. Price checks still work if email is not configured; the alert simply will not be sent.

For broader store comparison, SitePilot has an optional **Find Better Prices** button backed by Google Shopping through SerpApi. Add:

```env
SERPAPI_KEY=your_serpapi_key
SHOPPING_COUNTRY=us
SHOPPING_LANGUAGE=en
```

Without `SERPAPI_KEY`, the core product-page tracker still works and the UI clearly reports that broader shopping search is not configured.

Price results can vary by location, account state, shipping destination, membership, coupons, taxes, and retailer anti-bot behavior. SitePilot records the price visible to its server-side browser; it should not be treated as a guaranteed checkout price.
