# ft_transcendence

## Contents
- Frontend: TypeScript dev setup (src → dist)
- Local dev server
- Docker + Nginx (how to open the site)
- Architecture overview (containers and data flow)
- Notes

---

## Frontend: TypeScript dev setup

Auto-compile TypeScript from `frontend/src/` to `frontend/dist/` and load it in the browser as ES modules.

1) Install Node.js (includes npm)
- macOS: `brew install node`

2) Init and install TypeScript (inside `frontend/`)
```
cd frontend
npm init -y
npm i -D typescript
```

3) Add npm scripts to package.json
```
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --preserveWatchOutput"
  }
}
```

4) Create tsconfig.json (src → dist)
```
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "strict": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

5) Reference the built file from HTML
- In `frontend/index.html`:
```
<script type="module" src="dist/script.js"></script>
```

6) Start auto compilation (in `frontend/`)
```
npm run dev
```

---

## Local dev server (serve over HTTP)
Use any static server while `npm run dev` is watching:
- VS Code Live Server (recommended), or
- From `frontend/`: `python3 -m http.server 8000` → open http://localhost:8000

Notes:
- ES modules in the browser require `type="module"` on the script tag.
- Keep sources in `frontend/src/` and compiled output in `frontend/dist/`.
- Add `frontend/dist/` and `node_modules/` to `.gitignore`.
- Do not ignore `package.json` or `package-lock.json`.

---

## Docker + Nginx (production-like serve)

- Build and run (via Compose at repo root):
```
docker compose up --build -d
docker compose ps
```
- Open the published ports shown by `docker compose ps`.
  - Nginx listens on container ports 80 (HTTP → redirects to HTTPS) and 443 (HTTPS).
  - Example: if mapped to host `8080:80` and `8443:443`, open:
    - HTTP (redirects): http://localhost:8080
    - HTTPS (self-signed): https://localhost:8443

Quick checks:
```
curl -I http://localhost:<host_http_port>
curl -kI https://localhost:<host_https_port>
```

---

## Architecture and Dataflow

This project is a microservices-based application composed of four main services orchestrated by Docker Compose: `nginx`, `frontend`, `backend`, and `engine`.

### Services

*   **`nginx`**: Acts as the entry point for the application. It's a reverse proxy that serves the frontend application and forwards API requests to the backend.
    *   Listens on port 80 (and 443 for HTTPS).
    *   Serves the static files (HTML, CSS, JS) of the frontend application.
    *   Routes all requests starting with `/api/` to the `backend` service.

*   **`frontend`**: A single-page application (SPA) built with TypeScript.
    *   The user interface of the application.
    *   It communicates with the `backend` service through the `/api` endpoint.
    *   In the current implementation, it features a button that, when clicked, fetches data from the backend and displays it.

*   **`backend`**: A Node.js application built with Fastify.
    *   Acts as a bridge between the `frontend` and the `engine`.
    *   Exposes a REST API at `/api`.
    *   When it receives a request at `/api/hello`, it calls the `engine` service to get the current game state.

*   **`engine`**: A Node.js application built with Fastify.
    *   Manages the game logic and state.
    *   Simulates a bouncing ball within a [-1, 1] coordinate system and updates its position every 100ms.
    *   Exposes an endpoint at `/state` that returns the ball's current position (x, y) and velocity (vx, vy).

### Data Flow (Detailed)

#### 1. User Opens Website
```
Browser → http://localhost:8080 (or 8443 for HTTPS)
```

#### 2. Nginx Receives Request
- **nginx** container (port 8080/8443) receives the request
- Checks the path: `/` is not `/api/`, so it serves static files
- Returns `frontend/index.html` + assets (style.css, dist/main.js)

#### 3. Frontend Loads in Browser
- Browser parses HTML and loads `frontend/index.html`
- Shows button "Fetch from API" and `<pre id="output"></pre>`

#### 4. User Clicks "Fetch from API" Button
```javascript
fetch("/api/hello")  // Relative URL → goes to nginx
```

#### 5. Nginx Routes to Backend
- **nginx** sees `/api/` prefix
- Forwards request to `http://backend:3000/api/hello` (via nginx.conf proxy_pass)
- Uses internal Docker network `transnet` to reach **backend** container

#### 6. Backend Receives Request
`backend/src/index.ts`:
```typescript
app.get("/api/hello", async () => {
  const res = await fetch("http://engine:4000/state");  // Calls engine
  const state = await res.json();
  return { from: "backend", engineState: state };
});
```

#### 7. Backend Calls Engine
- **backend** makes HTTP request to `http://engine:4000/state`
- Uses internal Docker network `transnet` to reach **engine** container

#### 8. Engine Returns Ball State
`engine/src/index.ts`:
```typescript
let ball = { x: 0, y: 0, vx: 0.01, vy: 0.008 };

setInterval(() => {
  ball.x += ball.vx;   // Simulates movement
  ball.y += ball.vy;
  if (ball.x > 1 || ball.x < -1) ball.vx *= -1;  // Bounces
  if (ball.y > 1 || ball.y < -1) ball.vy *= -1;
}, 100);

app.get("/state", async () => ball);  // Returns current state
```

**Engine responds with:**
```json
{ "x": 0.005, "y": 0.004, "vx": 0.01, "vy": 0.008 }
```

#### 9. Backend Wraps and Returns
**Backend responds with:**
```json
{
  "from": "backend",
  "engineState": { "x": 0.005, "y": 0.004, "vx": 0.01, "vy": 0.008 }
}
```

#### 10. Nginx Passes Response Back
- Response travels back through nginx to the browser

#### 11. Frontend Displays Data
```javascript
document.getElementById("output").textContent = JSON.stringify(data, null, 2);
```

**Browser shows:**
```json
{
  "from": "backend",
  "engineState": {
    "x": 0.005,
    "y": 0.004,
    "vx": 0.01,
    "vy": 0.008
  }
}
```

### Container Communication Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Host Machine                      │
│   Port 8080 (HTTP) / 8443 (HTTPS)                  │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │     nginx:80      │
        │   (reverse proxy)  │
        └────────┬──────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      │    /  (static)  /api/ (proxy)
      │     [index.html]    │
      │     [style.css]     │
      │     [main.js]       │
      │                     │
      │          ┌──────────▼────────┐
      │          │   backend:3000    │
      │          │   (API server)     │
      │          └────────┬──────────┘
      │                   │
      │                   │ fetch("http://engine:4000/state")
      │                   │
      │          ┌────────▼──────────┐
      │          │   engine:4000     │
      │          │ (game simulation)  │
      │          │  ball state loop   │
      │          └───────────────────┘
      │
      └──────────────────────────────┐
                                     │
                          ┌──────────▼────────┐
                          │ Frontend (Browser) │
                          │  [index.html]      │
                          │ Shows: JSON data   │
                          └────────────────────┘
```

### Key Points

- **All 3 backend services** communicate via the `transnet` bridge network (internal Docker DNS)
- **Frontend only talks to nginx** (not directly to backend or engine)
- **Engine continuously simulates** the ball bouncing every 100ms
- **State is stateless**: each request fetches the current ball position at that moment
- **Only frontend is exposed**: backend and engine are hidden behind nginx; only nginx is reachable from the host

---