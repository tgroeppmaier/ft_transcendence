import { navigateTo } from "../router.js";

export function LocalTournamentView() {
  const container = document.createElement("div");
  container.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4";

  // State
  let step = 1;
  let playerCount = 3;
  let playerNames: string[] = [];

  const render = () => {
    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "bg-white p-8 rounded-xl shadow-md w-full max-w-md";
    
    const title = document.createElement("h2");
    title.className = "text-2xl font-bold mb-6 text-center text-gray-800";
    title.textContent = "Local Tournament Setup";
    card.appendChild(title);

    if (step === 1) {
      const label = document.createElement("label");
      label.className = "block text-gray-700 text-sm font-bold mb-2";
      label.textContent = "Number of Players (3-6):";
      
      const input = document.createElement("input");
      input.type = "number";
      input.min = "3";
      input.max = "6";
      input.value = String(playerCount);
      input.className = "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4";
      
      const nextBtn = document.createElement("button");
      nextBtn.className = "w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition";
      nextBtn.textContent = "Next";
      
      nextBtn.onclick = () => {
        const val = parseInt(input.value);
        if (val >= 3 && val <= 6) {
          playerCount = val;
          step = 2;
          // Initialize empty names if not set
          if (playerNames.length !== playerCount) {
             playerNames = Array(playerCount).fill("").map((_, i) => `Player ${i + 1}`);
          }
          render();
        } else {
          alert("Please enter a number between 3 and 6");
        }
      };

      card.appendChild(label);
      card.appendChild(input);
      card.appendChild(nextBtn);

    } else if (step === 2) {
      const form = document.createElement("div");
      form.className = "flex flex-col gap-3 mb-6";

      playerNames.forEach((name, index) => {
        const group = document.createElement("div");
        
        const label = document.createElement("label");
        label.className = "block text-gray-700 text-sm font-bold mb-1";
        label.textContent = `Player ${index + 1} Name:`;

        const input = document.createElement("input");
        input.type = "text";
        input.value = name;
        input.className = "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline";
        input.oninput = (e) => {
          playerNames[index] = (e.target as HTMLInputElement).value;
        };

        group.appendChild(label);
        group.appendChild(input);
        form.appendChild(group);
      });

      const btnGroup = document.createElement("div");
      btnGroup.className = "flex gap-4";

      const backBtn = document.createElement("button");
      backBtn.className = "flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition";
      backBtn.textContent = "Back";
      backBtn.onclick = () => {
        step = 1;
        render();
      };

      const startBtn = document.createElement("button");
      startBtn.className = "flex-1 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition";
      startBtn.textContent = "Start Tournament";
      startBtn.onclick = () => {
        console.log("Starting tournament with:", playerNames);
        alert(`Tournament ready with players: ${playerNames.join(", ")}`);
        // TODO: Proceed to tournament logic
      };

      btnGroup.appendChild(backBtn);
      btnGroup.appendChild(startBtn);
      
      card.appendChild(form);
      card.appendChild(btnGroup);
    }

    container.appendChild(card);
  };

  render();

  return { component: container };
}