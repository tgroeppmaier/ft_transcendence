import Fastify from "fastify";
import fetch from "node-fetch";

const app = Fastify({ logger: true });

app.get("/api/hello", async () => {
  // call the engine service
  const res = await fetch("http://engine:4000/state");
  const state = await res.json();
  return { from: "backend", engineState: state };
});

app.listen({ host: "0.0.0.0", port: 3000 });
