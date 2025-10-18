import Fastify from "fastify";

const app = Fastify({ logger: true });

let ball = { x: 0, y: 0, vx: 0.01, vy: 0.008 };

setInterval(() => {
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.x > 1 || ball.x < -1) ball.vx *= -1;
  if (ball.y > 1 || ball.y < -1) ball.vy *= -1;
}, 100);

app.get("/state", async () => ball);

app.listen({ host: "0.0.0.0", port: 4000 });
