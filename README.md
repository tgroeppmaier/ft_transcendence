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
  - [Routing System](#routing-system)
    - [Overview](#overview-1)
    - [How Routing Works (Step by Step)](#how-routing-works-step-by-step)
      - [1. Application Initialization](#1-application-initialization)
      - [2. Route Registry](#2-route-registry)
      - [3. User Clicks Navigation Button](#3-user-clicks-navigation-button)
      - [4. Navigation Happens](#4-navigation-happens)
      - [5. View Switching (render function)](#5-view-switching-render-function)
      - [6. Cleanup Pattern](#6-cleanup-pattern)
      - [7. Browser Back/Forward Buttons](#7-browser-backforward-buttons)
    - [Data Flow Diagram](#data-flow-diagram)
    - [Key Concepts](#key-concepts)
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

## Routing System

### Overview
The application uses a **client-side router** that enables seamless navigation between views without full page reloads. The router intercepts navigation events, updates the browser's URL and history, and swaps out view components dynamically.

### How Routing Works (Step by Step)

#### 1. Application Initialization
When application first loads:

```
User opens http://localhost:8080
  ↓
browser/index.html is served by Caddy
  ↓
frontend/dist/index.js is loaded as an ES module
  ↓
router.ts initializes: render(window.location.pathname)
  ↓
Current URL path (e.g., "/") is matched against routes registry
  ↓
Corresponding view factory function is called (e.g., MainMenu())
  ↓
View component is mounted to DOM at #app element
```

#### 2. Route Registry
The [`routes`](frontend/src/router.ts) object maps URL paths to view factory functions:

```typescript
const routes: { [key: string]: () => View } = {
  "/": MainMenu,
  "/local-game": LocalGame,
  "/tournament": Tournament,
};
```

Each key is a URL path, and each value is a **function** (not a component instance). This is important—it defers view creation until navigation occurs, ensuring each view gets a fresh component with clean state.

#### 3. User Clicks Navigation Button
When a user clicks a button in the UI:

```
User clicks "Local Game" button
  ↓
index.ts event listener catches the click
  ↓
e.preventDefault() stops default browser behavior
  (without this, the button might submit as a form)
  ↓
navigateTo("/local-game") is called
```

The `e.preventDefault()` call is crucial for buttons that might otherwise trigger unwanted default behavior. In your case, it ensures the router handles navigation instead of the browser.

#### 4. Navigation Happens
The [`navigateTo`](frontend/src/router.ts) function does two things:

```typescript
export function navigateTo(pathname: string) {
  window.history.pushState({}, pathname, window.location.origin + pathname);
  render(pathname);
}
```

- **`window.history.pushState()`** updates the browser's URL bar and history stack without reloading the page. This allows back/forward buttons to work correctly and lets users bookmark/share URLs.
- **`render(pathname)`** handles the actual view switching logic.

#### 5. View Switching (render function)
The [`render`](frontend/src/router.ts) function orchestrates the view swap:

```
render("/local-game") is called
  ↓
Check if previous view has cleanup function
  ├─ Yes: call it (removes event listeners, clears timers, etc.)
  └─ No: do nothing
  ↓
Clear DOM: root.innerHTML = ""
  ↓
Look up route: routes["/local-game"]() 
  (calls LocalGame factory function to create new component)
  ↓
Append component to DOM: root.appendChild(view.component)
  ↓
Store cleanup function: currentCleanup = view.cleanup
  (for next navigation)
```

#### 6. Cleanup Pattern
Each view optionally returns a cleanup function in the [`View`](frontend/src/router.ts) type:

```typescript
type View = {
  component: HTMLElement;
  cleanup?: () => void;
};
```

For example, the [`LocalGame`](frontend/src/views/LocalGame.ts) view registers keyboard listeners and a game loop interval:

```typescript
const cleanup = () => {
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("keyup", onKeyUp);
  clearInterval(intervalId);
};

return { component: gameContainer, cleanup };
```

This cleanup runs automatically when navigating away, preventing:
- Event listeners from firing on detached DOM
- Game loop intervals from running in the background
- Memory leaks from accumulated listeners

#### 7. Browser Back/Forward Buttons
When a user clicks the back or forward button:

```
User clicks browser back button
  ↓
window.onpopstate event fires
  ↓
Handler calls: render(window.location.pathname)
  (render uses the URL that the browser just navigated to)
  ↓
Same cleanup and view-switching logic runs
```

This ensures history navigation works seamlessly without requiring explicit router code.

### Data Flow Diagram

```
┌────────────────────────────────────────────────────────┐
│                  User Action                           │
│            (click button, back, forward, URL change)   │
└────────────────┬─────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  navigateTo()  │  (or onpopstate handler)
         │   or onpopstate│
         └───────┬────────┘
                 │
      ┌──────────▼─────────┐
      │  history.pushState │
      │  (update URL bar)  │
      └──────────┬─────────┘
                 │
      ┌──────────▼──────────────┐
      │  render(pathname)       │
      └──────────┬──────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────┐      ┌─────────────────┐
│   Cleanup   │      │ View Factory    │
│  previous   │      │  Call routes[]  │
│    view     │      │   Get component │
└─────────────┘      └────────┬────────┘
    │                         │
    │      ┌──────────────────┘
    │      │
    ▼      ▼
 ┌────────────────┐
 │ DOM Update     │
 │ - Clear old    │
 │ - Mount new    │
 │ - Store cleanup│
 └────────────────┘
    │
    ▼
 ┌────────────────┐
 │  View visible  │
 │  to user       │
 └────────────────┘
```

### Key Concepts

- **Factory Pattern**: Routes store functions, not instances. Each navigation creates a fresh component with clean state.
- **Cleanup**: Views can define teardown logic to free resources and prevent memory leaks.
- **History Integration**: `history.pushState()` keeps the URL in sync without full page reloads.
- **Event Delegation**: The click listener in [`index.ts`](frontend/src/index.ts) uses event delegation on the `#app` container, catching clicks from any current or future view.
- **Single-Page Application (SPA)**: No server-side routing needed—all navigation happens in the browser.

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