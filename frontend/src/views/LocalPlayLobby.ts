import { navigateTo } from "../router.js";
import { LocalGame } from "./LocalGame.js";

export function LocalGameLobby() {
  const gameLobby = document.createElement("div");
  gameLobby.innerHTML = `
    <h1>Local Lobby</h1>
    <form>
    <label for="max_score">Enter maximal score:</label>
    <input type="text" id="max_score" name="max_score"/>
    <button type="button" id="LobbyButton">Submit</button>
    <!-- <button type="button" id="LobbyButton" onclick="LocalGame()">Submit</button> -->
    </form>
  `;
return {component: gameLobby};
}