# ft_transcendence

A robust, microservices-based implementation of the classic Pong game, featuring real-time multiplayer, social features, and a scalable architecture.

## 🏗 Architecture

The application is composed of **5 distinct services**, orchestrated via Docker Compose.

### 1. **Caddy (Reverse Proxy)**
- **Role**: The single entry point for all client requests.
- **Functions**:
  - Handles HTTPS/TLS termination.
  - Serves the **Frontend** static files.
  - Routes API requests to the appropriate internal services based on URL paths.

### 2. **Frontend (UI)**
- **Tech**: TypeScript, Tailwind CSS.
- **Role**: Single Page Application (SPA).
- **Function**: Renders the interface, manages game rendering via Canvas API, and handles user interactions.

### 3. **Database Service (Business Logic & Persistence)**
- **Tech**: Node.js (Fastify), SQLite.
- **Role**: The "Brain" of the platform.
- **Functions**:
  - **Auth**: User registration, Login (JWT), Google OAuth.
  - **Persistence**: Stores Users, Friends, Match History, and Tournament configurations.
  - **API**: Handles all REST endpoints (except active game sessions).

**Endpoints:**
- **Authentication**
  - `POST /registration`: Register a new user.
  - `POST /login`: Authenticate with credentials.
  - `POST /logout`: Invalidate session.
  - `GET /auth/google`: Initiate Google OAuth flow.
- **Profile**
  - `GET /profile`: Fetch current user data.
  - `PUT /profile`: Update user details.
  - `DELETE /profile`: Delete user account.
  - `POST /avatar`: Upload profile image.
  - `GET /search`: Search users by login.
- **Social**
  - `GET /friends`: List accepted friends.
  - `POST /friend-request`: Send a friend request.
  - `POST /friend-accept`: Accept a friend request.
  - `DELETE /friend-remove`: Remove a friend.
  - `GET /match-history`: Retrieve past match results.
- **Game & Tournament**
  - `POST /game/create`: Initialize a new game record.
  - `POST /game/invite`: Invite a friend to a game.
  - `GET /game/:id`: Get game metadata.
  - `POST /tournament/create`: Create a new tournament.
  - `POST /tournament/:id/start`: Begin a tournament.
- **Internal**
  - `POST /internal/match-result`: Save final game scores (called by Backend).

### 4. **Backend Service (Game Gateway)**
- **Tech**: Node.js (Fastify + WebSockets).
- **Role**: The "Nervous System" of the game.
- **Functions**:
  - Manages active game sessions in memory.
  - Handles WebSocket connections (`/api/ws`).
  - Acts as a bridge, relaying inputs from Frontend to Engine, and state from Engine to Frontend.
  - **Post-Game**: Sends final scores to the Database Service for persistence.

**Endpoints:**
- **Real-Time**
  - `GET /api/ws/:id`: **WebSocket** endpoint for game state streaming and input.
- **CLI / Interop**
  - `POST /api/games`: Create an in-memory game instance.
  - `GET /api/games/:id/state`: Get snapshot of current game state (Polling).
  - `POST /api/games/:id/action`: Send paddle commands via HTTP.

### 5. **Engine Service (Physics)**
- **Tech**: Node.js.
- **Role**: The "Heart" of the simulation.
- **Functions**:
  - Pure physics simulation (Collision detection, velocity vectors).
  - Runs a high-frequency game loop (60 ticks/sec).
  - Broadcasts raw game state to the Backend.

---

## 🔄 Program Flow

### 1. Authentication & Browsing
*Flow: Frontend ↔ Caddy ↔ Database Service*
1.  User performs an action (e.g., Login, View Profile).
2.  **Caddy** receives the request at `/api/*` (e.g., `/api/login`).
3.  It forwards the request to the **Database Service**.
4.  The service queries the local SQLite file (`users.db`) and returns the JSON response.

### 2. Matchmaking (Starting a Game)
*Flow: Frontend ↔ Caddy ↔ Database Service*
1.  User clicks "Play" or invites a friend.
2.  A request is sent to the **Database Service** (`/api/game/create`).
3.  The service creates a permanent record of the match (ID: `123`, Status: `waiting`) and returns the Game ID.

### 3. Game Connection
*Flow: Frontend ↔ Caddy ↔ Backend Service*
1.  Frontend initiates a WebSocket connection to `wss://localhost:8443/api/ws/123`.
2.  **Caddy** recognizes the `/api/ws` prefix and routes it to the **Backend Service**.
3.  **Backend** validates the Game ID and Token.
4.  **Backend** connects to the **Engine Service** via an internal WebSocket.

### 4. Gameplay Loop
*Flow: Frontend ↔ Caddy ↔ Backend ↔ Engine*
1.  **Engine**: Simulates one frame of physics. Sends state (Ball X/Y) to Backend.
2.  **Backend**: Relays state to both connected clients (Frontend).
3.  **Frontend**: Draws the frame.
4.  **User**: Presses a key (Move Up).
5.  **Frontend**: Sends input to Backend -> Engine.
6.  **Engine**: Updates paddle position for the next frame.

### 5. Game Over
*Flow: Engine → Backend → Database Service*
1.  **Engine** detects a win condition (Score reached).
2.  It notifies the **Backend**.
3.  **Backend** sends an internal HTTP POST to the **Database Service** (`http://database:3000/internal/match-result`) with the final score.
4.  **Database Service** saves the result to `users.db` and updates user statistics (Wins/Losses).

---

## 🚀 Quick Start

1. **Build and Run**
   ```bash
   docker compose up --build
   ```

2. **Access the App**
   Open [https://localhost:8443](https://localhost:8443) in your browser.
   *(Accept the self-signed certificate warning)*

3. **Stop**
   ```bash
   docker compose down
   ```
