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
    *   Listens on port 80.
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
    *   Manages the game logic.
    *   In the current implementation, it simulates a bouncing ball and exposes an endpoint at `/state` to get the ball's current position and velocity.

### Data Flow

1.  The user's browser sends a request to the application's main URL.
2.  `nginx` receives the request and serves the `frontend`'s `index.html` and its assets.
3.  The user clicks the "Fetch from API" button on the webpage.
4.  The `frontend` sends a GET request to `/api/hello`.
5.  `nginx` receives the request and, because the path starts with `/api/`, it forwards the request to the `backend` service.
6.  The `backend` service receives the request at `/api/hello` and calls the `engine` service's `/state` endpoint.
7.  The `engine` service returns the current game state (the ball's position and velocity) to the `backend`.
8.  The `backend` service wraps the engine's state in a JSON object and returns it to the `frontend`.
9.  The `frontend` receives the JSON response and displays the data on the page.

---