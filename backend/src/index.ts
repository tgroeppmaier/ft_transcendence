import Fastify from "fastify";

// Create Fastify server instance with logging enabled
const app = Fastify({ logger: true });

// Register GET endpoint /api/hello
// When a request arrives, fetch the current ball state from the engine service
// and wrap it in a response object before returning to the client
app.get("/api/hello", async () => {
  // Make an HTTP request to the engine service at http://engine:4000/state
  // (engine is resolved via Docker's internal DNS on the transnet bridge network)
  const res = await fetch("http://engine:4000/state");
  
  // Parse the response body as JSON
  // Result: { x: number, y: number, vx: number, vy: number }
  const state = await res.json();
  
  // Return a wrapped response object
  // Fastify automatically converts this to JSON and sends it to the client
  return { from: "backend", engineState: state };
});

// Start the server listening on all interfaces (0.0.0.0) on port 3000
// This server waits for incoming HTTP requests from the frontend (via nginx)
app.listen({ host: "0.0.0.0", port: 3000 });
 