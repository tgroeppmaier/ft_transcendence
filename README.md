# ft_transcendence

A robust, microservices-based implementation of the classic Pong game, featuring real-time multiplayer, social features, and a scalable architecture.

## 🏗 Architecture

The application is composed of **3 distinct services**, orchestrated via Docker Compose.

### 1. **Caddy (Reverse Proxy)**
- **Role**: The single entry point for all client requests.
- **Functions**:
  - Handles HTTPS/TLS termination.
  - Serves the **Frontend** static files.
  - Routes API requests to the appropriate internal services based on URL paths.

### 2. **Backend Service (Game Brain & Engine)**
- **Tech**: Node.js (Fastify + WebSockets).
- **Role**: The "Brain" and "Heart" of the game.
- **Functions**:
  - **Game Logic**: Pure physics simulation (Collision detection, velocity vectors) running at 60 FPS.
  - **Session Management**: Holds all active data in memory (Games, Players, Invites).
  - **Matchmaking**: Handles creation of games and processing of invitations directly in RAM.
  - **Real-Time**: Handles WebSocket connections (`/api/ws`) for state streaming and input.
  - **Post-Game**: Sends final scores to the Database Service for persistence.

**Endpoints:**
- **Real-Time**
  - `GET /api/ws/:id`: **WebSocket** endpoint for game state streaming and input.
- **Game Management**
  - `POST /api/games`: Create a new in-memory game instance.
  - `GET /api/games`: List active "waiting" games (Lobby).
- **Invite System**
  - `POST /api/invite`: Create a pending game invite. Accepts optional `gameId` to invite to an existing session.
  - `GET /api/invites`: List pending invites for the current user.
  - `POST /api/invite/accept`: Accept an invite and resolve it to a Game ID.
- **CLI / Interop**
  - `GET /api/games/:id/state`: Get snapshot of current game state (Polling).
  - `POST /api/games/:id/action`: Send paddle commands via HTTP.

### 3. **Database Service (Persistence Layer)**
- **Tech**: Node.js (Fastify), SQLite.
- **Role**: The "Vault" for long-term storage.
- **Functions**:
  - **Auth**: User registration, Login (JWT), Google OAuth.
  - **Persistence**: Stores Users, Friends, Match History, and Tournament configurations.
  - **Internal Verification**: Provides internal endpoints for the Backend to verify relationships (e.g., Friendship).

**Endpoints:**
- **Authentication**
  - `POST /registration`: Register a new user.
  - `POST /login`: Authenticate with credentials.
  - `POST /logout`: Invalidate session.
  - `GET /auth/google`: Initiate Google OAuth flow.
  - `GET /auth/google/callback`: Handle OAuth callback.
- **Profile**
  - `GET /profile`: Fetch current user data.
  - `PUT /profile`: Update user details.
  - `DELETE /profile`: Delete user account.
  - `POST /avatar`: Upload profile image.
  - `DELETE /avatar`: Remove profile image.
  - `GET /search`: Search users by login.
- **Social**
  - `GET /friends`: List accepted friends.
  - `GET /friend-requests`: List pending friend requests.
  - `POST /friend-request`: Send a friend request.
  - `POST /friend-accept`: Accept a friend request.
  - `POST /friend-reject`: Reject a friend request.
  - `DELETE /friend-remove`: Remove a friend.
  - `GET /match-history`: Retrieve past match results.
- **Tournament**
  - `POST /tournament/create`: Create a new tournament.
  - `GET /tournament/invitations`: List tournament invites.
  - `GET /tournament/:id`: Get tournament details.
  - `POST /tournament/:id/accept`: Accept tournament invite.
  - `POST /tournament/:id/decline`: Decline tournament invite.
  - `POST /tournament/:id/start`: Begin a tournament.
  - `POST /tournament/:id/finish`: Mark tournament as finished.
- **Internal (Service-to-Service)**
  - `POST /internal/match-result`: Save final game scores (called by Backend).
  - `POST /internal/check-friendship`: Verify friendship status (called by Backend).

---

## 🔄 Program Flow

### 1. Authentication & Browsing
*Flow: Frontend ↔ Caddy ↔ Database Service*
1.  User performs an action (e.g., Login, View Profile).
2.  **Caddy** receives the request at `/api/*` (e.g., `/api/login`).
3.  It forwards the request to the **Database Service**.
4.  The service queries the local SQLite file (`users.db`) and returns the JSON response.

### 2. Matchmaking & Invites (Starting a Game)
*Flow: Frontend ↔ Caddy ↔ Backend Service*
1.  **Create (Public):** User clicks "Create". Frontend calls `POST /api/games` on **Backend**. Game created in RAM.
2.  **Invite (Private):** User invites friend. Frontend calls `POST /api/invite` on **Backend**.
    - Can invite to a new game (auto-created) or an existing active game.
    - Backend verifies friendship via Database.
    - Backend creates Invite record in RAM.
3.  **Accept:** Friend calls `POST /api/invite/accept` on **Backend**. Backend returns the Game ID.

### 3. Game Connection
*Flow: Frontend ↔ Caddy ↔ Backend Service*
1.  Frontend initiates a WebSocket connection to `wss://localhost:8443/api/ws/<GameID>`.
2.  **Caddy** recognizes the `/api/ws` prefix and routes it to the **Backend Service**.
3.  **Backend** validates the Game ID and Token.
4.  **Backend** initializes the game loop if both players connect.

### 4. Gameplay Loop
*Flow: Frontend ↔ Caddy ↔ Backend*
1.  **Backend**: Simulates one frame of physics. Sends state (Ball X/Y) to both connected clients.
2.  **Frontend**: Draws the frame based on received state.
3.  **User**: Presses a key (Move Up).
4.  **Frontend**: Sends input to Backend.
5.  **Backend**: Updates paddle position for the next frame.

### 5. Game Over
*Flow: Backend → Database Service*
1.  **Backend** detects a win condition (Score reached) or player disconnect.
2.  **Backend** sends an internal HTTP POST to the **Database Service** (`http://database:3000/internal/match-result`) with the final score.
3.  **Database Service** saves the result to `users.db`.
4.  **Backend** destroys the in-memory game instance.

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