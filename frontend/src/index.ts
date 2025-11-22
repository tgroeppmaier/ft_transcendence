// ---------------------- Elements ----------------------
const uiWrapper = document.getElementById("uiWrapper")!;
const topMenu = document.getElementById("topMenu")!;
const registration = document.getElementById("registration") as HTMLFormElement;
const login = document.getElementById("login") as HTMLFormElement;
const menu = document.getElementById("menu")!;
const board = document.getElementById("board") as HTMLCanvasElement;
const profileInfo = document.getElementById("profileInfo")!;
const usernameDisplay = document.getElementById("usernameDisplay")!;
const out = document.getElementById("output")!;
const regBtn = document.getElementById("showRegister") as HTMLButtonElement;
const logBtn = document.getElementById("showLogin") as HTMLButtonElement;

// ---------------------- Toggle Buttons ----------------------
function toggleForms(activeBtn: HTMLButtonElement, inactiveBtn: HTMLButtonElement) {
  if (activeBtn === regBtn) {
    registration.classList.remove("hidden");
    login.classList.add("hidden");
  } else {
    login.classList.remove("hidden");
    registration.classList.add("hidden");
  }

  activeBtn.classList.add("bg-gray-900");
  activeBtn.classList.remove("bg-gray-700");
  inactiveBtn.classList.add("bg-gray-700");
  inactiveBtn.classList.remove("bg-gray-900");

  out.textContent = "";
}

regBtn.addEventListener("click", () => toggleForms(regBtn, logBtn));
logBtn.addEventListener("click", () => toggleForms(logBtn, regBtn));

// ---------------------- Registration ----------------------
registration.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = (document.getElementById("regUsername") as HTMLInputElement).value;
  const password = (document.getElementById("regPassword") as HTMLInputElement).value;

  if (!username || !password) {
    out.textContent = "Please enter username and password";
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) out.textContent = `Error: ${data.error || JSON.stringify(data)}`;
    else {
      out.textContent = `User created: ${JSON.stringify(data)}`;
      registration.reset();
      startSimulation(username);
    }
  } catch (err) {
    out.textContent = `Fetch error: ${err}`;
  }
});

// ---------------------- Login ----------------------
login.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = (document.getElementById("loginUsername") as HTMLInputElement).value;
  const password = (document.getElementById("loginPassword") as HTMLInputElement).value;

  if (!username || !password) {
    out.textContent = "Please enter username and password";
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) out.textContent = `Error: ${data.error || JSON.stringify(data)}`;
    else {
      out.textContent = `Logged in as: ${username}`;
      login.reset();
      startSimulation(username);
    }
  } catch (err) {
    out.textContent = `Fetch error: ${err}`;
  }
});

// ---------------------- Simulation / Game Mode ----------------------
function startSimulation(username: string) {
  uiWrapper.classList.add("hidden");
  board.classList.remove("hidden");
  topMenu.classList.remove("hidden");
  usernameDisplay.textContent = username;
}

// Exit simulation
document.getElementById("exitSimulation")!.addEventListener("click", () => {
  uiWrapper.classList.remove("hidden");
  board.classList.add("hidden");
  topMenu.classList.add("hidden");
});

// ---------------------- Menu Navigation ----------------------
document.getElementById("profile")!.addEventListener("click", () => {
  menu.classList.add("hidden");
  profileInfo.classList.remove("hidden");
});
document.getElementById("backToMenu")!.addEventListener("click", () => {
  profileInfo.classList.add("hidden");
  menu.classList.remove("hidden");
});
document.getElementById("logout")!.addEventListener("click", () => {
  menu.classList.add("hidden");
  board.classList.add("hidden");
  profileInfo.classList.add("hidden");
  uiWrapper.classList.remove("hidden");
});

// ---------------------- WebSocket + Game ----------------------
type Ball = { x: number; y: number; vx: number; vy: number };
type Paddle = { x: number; y: number; w: number; h: number };
type GameData = { ball: Ball; leftPaddle: Paddle };

const ws = new WebSocket("ws://localhost:3000/api/ws");

ws.onopen = () => console.log("WS open");
ws.onclose = () => console.log("WS closed");
ws.onerror = (err) => console.error("WS error", err);

function renderFrame(data: GameData) {
  const ctx = board.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, board.width, board.height);

  const ball = data.ball;
  const paddle = data.leftPaddle;

  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(ball.x * board.width, ball.y * board.height, 0.04 * board.width, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "blue";
  ctx.fillRect(paddle.x * board.width, paddle.y * board.height, paddle.w * board.width, paddle.h * board.height);
}

ws.onmessage = (e) => {
  const data: GameData = JSON.parse(e.data);
  renderFrame(data);
};
