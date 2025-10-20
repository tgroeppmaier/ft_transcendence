import Fastify from "fastify";

// Create Fastify server instance with logging enabled
const app = Fastify({ logger: true });

// Initialize ball object with position (x, y) and velocity (vx, vy)
let ball = { x: 0, y: 0, vx: 0.01, vy: 0.008 };

// setInterval schedules this callback to run every 100ms in the background
// (does NOT block execution—program continues immediately after this line)
setInterval(() => {
  // Update ball position by adding velocity
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // Bounce off horizontal walls (x bounds: -1 to 1)
  if (ball.x > 1 || ball.x < -1) ball.vx *= -1;
  
  // Bounce off vertical walls (y bounds: -1 to 1)
  if (ball.y > 1 || ball.y < -1) ball.vy *= -1;
}, 100);

// Register GET endpoint /state that returns the current ball object
// Fastify automatically converts it to JSON in the response
app.get("/state", async () => ball);

// Start the server listening on all interfaces (0.0.0.0) on port 4000
// The setInterval callback runs concurrently in the background while server waits for requests
app.listen({ host: "0.0.0.0", port: 4000 });