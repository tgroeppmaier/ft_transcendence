# Transcendence

A microservices-based web application simulating a bouncing ball game, built with TypeScript, Node.js, Fastify, and Docker. It features real-time WebSocket communication between frontend, backend, and engine services, orchestrated via Caddy as a reverse proxy.

## Table of Contents
- [Transcendence](#transcendence)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [Engine](#engine)
  - [Setup](#setup)
    - [Frontend: TypeScript Dev Setup](#frontend-typescript-dev-setup)
    - [Local Dev Server (Serve over HTTP)](#local-dev-server-serve-over-http)
    - [Docker + Caddy (Production-like Serve)](#docker--caddy-production-like-serve)
  - [Architecture and Dataflow](#architecture-and-dataflow)
    - [Services](#services)
    - [Data Flow (Detailed)](#data-flow-detailed)
      - [1. User Opens Website](#1-user-opens-website)
      - [2. Caddy Receives Request](#2-caddy-receives-request)
      - [3. Frontend Loads in Browser](#3-frontend-loads-in-browser)
      - [4. Caddy Routes WebSocket Connection](#4-caddy-routes-websocket-connection)
      - [5. Backend Receives WebSocket Connection](#5-backend-receives-websocket-connection)
      - [6. Engine Broadcasts Ball State](#6-engine-broadcasts-ball-state)
      - [7. Backend Forwards Ball State](#7-backend-forwards-ball-state)
      - [8. Frontend Displays Data](#8-frontend-displays-data)
    - [Container Communication Diagram](#container-communication-diagram)
    - [Key Points](#key-points)
  - [Useful commands](#useful-commands)
    - [Docker](#docker)

---

## Overview

This project demonstrates a full-stack application with separated concerns: a user interface, API bridge, and game logic engine, all communicating via WebSockets for real-time updates.

### Frontend
A single-page application (SPA) built with TypeScript, auto-compiled from `src/` to `dist/` as ES modules. It renders the UI and establishes WebSocket connections to the backend for real-time ball state updates.

### Backend
A Node.js application using Fastify, acting as a WebSocket proxy between the frontend and engine. It exposes `/api/ws` and forwards engine messages to connected clients.

### Engine
A Node.js application using Fastify for game simulation. It maintains ball state (position and velocity) in a [-1, 1] coordinate system, updating every 100ms and broadcasting via WebSocket at `/ws`.

---

## Setup

### Frontend: TypeScript Dev Setup
Auto-compile TypeScript from `frontend/src/` to `frontend/dist/` and load it in the browser as ES modules.

1. Install Node.js (includes npm)
   - macOS: `brew install node`

2. Init and install TypeScript (inside `frontend/`)
   ```
   cd frontend
   npm init -y
   npm i -D typescript
   ```

3. Add npm scripts to package.json
   ```
   {
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch --preserveWatchOutput"
     }
   }
   ```

4. Create tsconfig.json (src → dist)
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

5. Reference the built file from HTML
   - In `frontend/index.html`:
   ```
   <script type="module" src="dist/script.js"></script>
   ```

6. Start auto compilation (in `frontend/`)
   ```
   npm run dev
   ```

### Local Dev Server (Serve over HTTP)
Use any static server while `npm run dev` is watching:
- VS Code Live Server (recommended), or
- From `frontend/`: `python3 -m http.server 8000` → open http://localhost:8000

Notes:
- ES modules in the browser require `type="module"` on the script tag.
- Keep sources in `frontend/src/` and compiled output in `frontend/dist/`.
- Add `frontend/dist/` and `node_modules/` to `.gitignore`.
- Do not ignore `package.json` or `package-lock.json`.

### Docker + Caddy (Production-like Serve)
- Build and run (via Compose at repo root):
  ```
  docker compose up --build -d
  docker compose ps
  ```
- Open the published ports shown by `docker compose ps`.
  - Caddy listens on container ports 80 (HTTP → redirects to HTTPS) and 443 (HTTPS).
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

This project is a microservices-based application composed of four main services orchestrated by Docker Compose: `caddy`, `frontend`, `backend`, and `engine`.

### Services

*   **`caddy`**: Acts as the entry point for the application. It's a reverse proxy that serves the frontend application and forwards API requests to the backend.
    *   Listens on port 80 (and 443 for HTTPS).
    *   Serves the static files (HTML, CSS, JS) of the frontend application.
    *   Routes all requests starting with `/api/` to the `backend` service.

*   **`frontend`**: A single-page application (SPA) built with TypeScript.
    *   The user interface of the application.
    *   It communicates with the `backend` service through a WebSocket connection.

*   **`backend`**: A Node.js application built with Fastify.
    *   Acts as a bridge between the `frontend` and the `engine`.
    *   Exposes a WebSocket endpoint at `/api/ws`.
    *   Forwards messages from the `engine` to all connected `frontend` clients.

*   **`engine`**: A Node.js application built with Fastify.
    *   Manages the game logic and state.
    *   Simulates a bouncing ball within a [-1, 1] coordinate system and updates its position every 100ms.
    *   Exposes a WebSocket endpoint at `/ws` that broadcasts the ball's current position (x, y) and velocity (vx, vy) to all connected clients.

### Data Flow (Detailed)

#### 1. User Opens Website
```
Browser → http://localhost:8080 (or 8443 for HTTPS)
```

#### 2. Caddy Receives Request
- **caddy** container (port 8080/8443) receives the request
- Checks the path: `/` is not `/api/`, so it serves static files
- Returns `frontend/index.html` + assets (style.css, dist/main.js)

#### 3. Frontend Loads in Browser
- Browser parses HTML and loads `frontend/index.html`
- The frontend JavaScript establishes a WebSocket connection to `wss://localhost:8443/api/ws`.

#### 4. Caddy Routes WebSocket Connection
- **caddy** sees the `/api/ws` path and upgrades the connection to a WebSocket connection.
- Forwards the WebSocket connection to `backend:3000/api/ws`.
- Uses the internal Docker network `transnet` to reach the **backend** container.

#### 5. Backend Receives WebSocket Connection
- The **backend** service accepts the WebSocket connection.
- The backend has already established a WebSocket connection to the **engine** service at `ws://engine:4000/ws`.

#### 6. Engine Broadcasts Ball State
- The **engine** service simulates the ball's movement.
- Every 100ms, it sends the current ball state as a JSON payload to all its connected clients (in this case, the **backend** service).

#### 7. Backend Forwards Ball State
- The **backend** service receives the ball state from the **engine**.
- It then forwards this state to all of its connected clients (the **frontend** applications).

#### 8. Frontend Displays Data
- The **frontend** receives the ball state through its WebSocket connection.
- It then updates the UI to display the new position of the ball.

### Container Communication Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Host Machine                      │
│   Port 8080 (HTTP) / 8443 (HTTPS)                  │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │     caddy:80      │
        │   (reverse proxy)  │
        └────────┬──────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      │    /  (static)  /api/ws (WebSocket)
      │     [index.html]    │
      │     [style.css]     │
      │     [main.js]       │
      │                     │
      │          ┌──────────▼────────┐
      │          │   backend:3000    │
      │          │ (WebSocket proxy) │
      │          └────────┬──────────┘
      │                   │
      │                   │ WebSocket to engine:4000/ws
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
                          │  WebSocket conn.   │
                          └────────────────────┘
```

### Key Points

- **All 3 backend services** communicate via the `transnet` bridge network (internal Docker DNS).
- **Frontend only talks to caddy** (not directly to backend or engine).
- **Engine continuously simulates** the ball bouncing every 100ms and broadcasts the state via WebSockets.
- **Backend acts as a WebSocket proxy**, forwarding the engine's state to the frontend.
- **Caddy handles HTTPS and WebSocket connections**, providing a secure and real-time communication channel.
- **Only the frontend is exposed**: backend and engine are hidden behind caddy; only caddy is reachable from the host.

---

## Useful commands

### Docker

- Build and run (via Compose at repo root):
  ```
  docker compose up --build -d
  docker compose ps
  ```
- Open the published ports shown by `docker compose ps`.
  - Caddy listens on container ports 80 (HTTP → redirects to HTTPS) and 443 (HTTPS).
  - Example: if mapped to host `8080:80` and `8443:443`, open:
    - HTTP (redirects): http://localhost:8080
    - HTTPS (self-signed): https://localhost:8443

Quick checks:
```
curl -I http://localhost:<host_http_port>
curl -kI https://localhost:<host_https_port>
```