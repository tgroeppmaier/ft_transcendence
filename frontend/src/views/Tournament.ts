export function Tournament() {
  const tournament = document.createElement("div");
  tournament.classList.add("tournament");
  tournament.innerHTML = `
      <h1>Welcome to the Lobby!</h1>
  `;
  return { component: tournament };
}
