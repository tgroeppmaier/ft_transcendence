export function RemoteTournamentView() {
  const tournamentContainer = document.createElement("div");
  tournamentContainer.id = "tournament";
  tournamentContainer.innerHTML = `
      <h1>Welcome to the Lobby!</h1>
  `;
  return { component: tournamentContainer };
}
