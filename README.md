# ft_transcendence

[Project Subject (PDF)](./transcendence.pdf)

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

**Endpoints**:
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

**Endpoints**:
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

## 🌟 Features & Modules

### Web
- **Backend Framework**: Built with **Fastify** for high performance and low overhead.
- **Frontend**: Developed using **TypeScript** and styled with **Tailwind CSS**.
- **Database**: **SQLite** used for persistent data storage (Users, History, Friends).

### User Management
- **Standard Auth**: Secure registration and login with JWT.
- **Remote Auth**: Google OAuth integration.
- **Profile**: Avatar upload, stats tracking (wins/losses), and match history.
- **Social**: Friend requests, accept/block/remove friends, and online status tracking.

### Gameplay
- **Local Game**: Play 1v1 on the same keyboard.
- **Local Tournament**: 3-6 players on a single machine with automated bracket management.
- **Remote Game**: Real-time 1v1 multiplayer over WebSockets.
- **Remote Tournament**: Online tournament system with single elimination.

### AI & Algorithms
- **AI Opponent**: Play against a server-side bot. The AI uses a periodic update system (1Hz refresh) with position prediction to simulate human reaction times and satisfy project constraints.
- **Stats**: Detailed user statistics and match history dashboards.

### Server-Side Pong
- **Authoritative Server**: All physics and game state are calculated on the backend to prevent cheating.
- **API**: Game state and controls exposed via HTTP endpoints for CLI or external integrations.

### DevOps & Architecture
- **Microservices Architecture**: The system is designed as a suite of loosely-coupled services (Backend, Database, Caddy). The Game Engine is completely decoupled from the User Management and Persistence layers, communicating via internal REST APIs to ensure scalability and modularity.

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

1. **Prerequisites**
   A `.env` file containing a `JWT_SECRET` is required. This can be generated automatically by running:
   ```bash
   make setup
   ```
   Alternatively, create a `.env` file manually in the root directory and add `JWT_SECRET=your_secret_here`.

2. **Build and Run**
   ```bash
   make build
   # OR
   docker compose up --build
   ```

3. **Access the App**
   Navigate to [https://localhost:8443](https://localhost:8443).
   *(Accept self-signed certificate warning)*

3. **Stop**
   ```bash
   docker compose down
   ```

---

## 💻 CLI Interoperability

The project exposes a REST API that allows for monitoring and controlling games directly from the terminal.

### 1. Authenticate
Interacting with the API requires a JWT token. One can be obtained by logging in:
```bash
curl -X POST https://localhost:8443/api/login \
     -H "Content-Type: application/json" \
     -c cookies.txt -k \
     -d '{"login": "username", "password": "password"}'
```
*Note: `-c cookies.txt` saves the session cookie for subsequent requests.*

### 2. Poll Game State
Retrieves the current position of the ball and paddles:
```bash
# Replace <GAME_ID> with a valid UUID
curl -X GET https://localhost:8443/api/games/<GAME_ID>/state \
     -b cookies.txt -k
```

### 3. Control the Paddle
Movement commands can be sent to the assigned paddle. 
- `move`: "start" or "stop"
- `direction`: "up" or "down"

**Move Up:**
```bash
curl -X POST https://localhost:8443/api/games/<GAME_ID>/action \
     -H "Content-Type: application/json" \
     -b cookies.txt -k \
     -d '{"side": "left", "move": "start", "direction": "up"}'
```

**Stop Movement:**
```bash
curl -X POST https://localhost:8443/api/games/<GAME_ID>/action \
     -H "Content-Type: application/json" \
     -b cookies.txt -k \
     -d '{"side": "left", "move": "stop", "direction": "up"}'
```