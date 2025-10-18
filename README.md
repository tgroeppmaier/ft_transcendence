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

## Architecture overview

- Nginx
  - Entry point, serves SPA (index.html + assets), terminates HTTPS.
  - Proxies to backend (and WS upgrades) if configured.

- Backend (e.g., Fastify)
  - REST API, WebSocket hub, orchestrates game engine, DB access.

- Server-Side Pong engine
  - Game logic (physics, scoring), talks only to the backend.

- SQLite
  - Persistent store for users, matches, stats; accessed by backend.

### Data flow (simplified)
```
Browser (SPA) ⇄ HTTPS/WSS ⇄ Nginx ⇄ Backend (API + WS) ⇄ Pong Engine
                                       │
                                       └── SQLite (file/volume)
```

---