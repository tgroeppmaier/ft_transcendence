import { navigateTo } from "../router.js";

export function SearchView() {
    const container = document.createElement("div");
    container.className = "max-w-lg mx-auto px-4 mt-8";
    container.innerHTML = `
        <h1 class="text-3xl font-bold mb-6">Search Users</h1>
        <div class="flex gap-4 mb-6">
             <button id="nav-menu" class="text-blue-800 font-semibold hover:opacity-60 transition">Back to Menu</button>
             <button id="nav-friends" class="text-blue-800 font-semibold hover:opacity-60 transition">Friends</button>
             <button id="nav-requests" class="text-blue-800 font-semibold hover:opacity-60 transition">Requests</button>
        </div>

        <div class="mb-6 flex gap-2">
            <input type="text" id="searchInput" placeholder="Search by username..." 
                class="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <button id="searchBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Search
            </button>
        </div>

        <div id="searchMessage" class="text-gray-600 mb-4"></div>

        <div id="resultsSection" class="hidden">
             <h2 class="text-xl font-semibold mb-3">Results</h2>
             <div id="resultsList" class="flex flex-col gap-3"></div>
        </div>
    `;

    const input = container.querySelector("#searchInput") as HTMLInputElement;
    const btn = container.querySelector("#searchBtn") as HTMLButtonElement;
    const resultsSection = container.querySelector("#resultsSection") as HTMLElement;
    const resultsList = container.querySelector("#resultsList") as HTMLElement;
    const message = container.querySelector("#searchMessage") as HTMLElement;

    // Navigation handlers
    container.querySelector("#nav-menu")?.addEventListener("click", () => navigateTo("/menu"));
    container.querySelector("#nav-friends")?.addEventListener("click", () => navigateTo("/friends"));
    container.querySelector("#nav-requests")?.addEventListener("click", () => navigateTo("/requests"));

    btn.addEventListener("click", async () => {
        const query = input.value.trim();
        message.textContent = "";

        if (!query) {
            message.textContent = "Enter a username to search.";
            resultsSection.classList.add("hidden");
            return;
        }

        try {
            const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
                credentials: "include"
            });

            const data = await res.json();
            resultsList.innerHTML = "";

            if (!res.ok) {
                message.textContent = data.message || "Search error";
                resultsSection.classList.add("hidden");
                return;
            }

            if (data.users.length === 0) {
                message.textContent = "No users found.";
                resultsSection.classList.add("hidden");
                return;
            }

            resultsSection.classList.remove("hidden");

            data.users.forEach((u: any) => {
                const card = document.createElement("div");
                card.className = "flex items-center justify-between p-3 bg-gray-100 rounded-xl";
                card.innerHTML = `
                <div class="flex items-center gap-3">
                    <img src="/uploads/${u.avatar ? u.avatar : 'default.png'}"
                    class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <p class="font-semibold">${u.login}</p>
                        <p class="text-gray-500 text-sm">${u.email}</p>
                    </div>
                </div>
                <button class="add-friend-btn bg-blue-600 text-white px-3 py-1 rounded-lg hover:opacity-60 transition" data-user-id="${u.id}">
                    Add
                </button>
                `;

                resultsList.appendChild(card);
                const addBtn = card.querySelector('.add-friend-btn') as HTMLButtonElement;

                if (addBtn) {
                    addBtn.addEventListener("click", async () => {
                        console.log("Clicked Add for user:", u.id);
                        await sendFriendRequest(u.id, addBtn);
                    });
                }
            });

        }
        catch (err) {
            console.error("Search error:", err);
            message.textContent = "Error performing search.";
        }
    });

    async function sendFriendRequest(addresseeId: number, btn: HTMLButtonElement) {
        try {
            btn.disabled = true;
            btn.textContent = "Sending...";

            const res = await fetch("/api/friend-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ addressee_id: addresseeId })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || "Error sending friend request");
                btn.disabled = false;
                btn.textContent = "Add";
                return;
            }

            btn.disabled = true;
            btn.textContent = "Request Sent";
            btn.classList.remove("bg-blue-600");
            btn.classList.add("bg-gray-400");

        }
        catch (err) {
            console.error("Friend request error:", err);
            alert("Error sending friend request");
            btn.disabled = false;
            btn.textContent = "Add";
        }
    }

    return { component: container };
}
