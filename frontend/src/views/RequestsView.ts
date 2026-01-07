import { navigateTo } from "../router.js";

export function RequestsView() {
    const container = document.createElement("div");
    container.className = "max-w-lg mx-auto px-4 mt-8";
    container.innerHTML = `
        <h1 class="text-3xl font-bold mb-6">Friend Requests</h1>
        <div class="flex gap-4 mb-6">
             <button id="nav-menu" class="text-blue-800 font-semibold hover:opacity-60 transition">Back to Menu</button>
             <button id="nav-friends" class="text-blue-800 font-semibold hover:opacity-60 transition">Friends</button>
             <button id="nav-search" class="text-blue-800 font-semibold hover:opacity-60 transition">Search Users</button>
             <button id="nav-profile" class="text-blue-800 font-semibold hover:opacity-60 transition">Profile</button>
        </div>
        <div id="requestsContainer" class="flex flex-col gap-4"></div>
        <p id="emptyMessage" class="text-center text-gray-500 mt-4"></p>
    `;

    const requestsContainer = container.querySelector("#requestsContainer") as HTMLElement;
    const emptyMessage = container.querySelector("#emptyMessage") as HTMLElement;

    // Navigation handlers
    container.querySelector("#nav-menu")?.addEventListener("click", () => navigateTo("/menu"));
    container.querySelector("#nav-friends")?.addEventListener("click", () => navigateTo("/friends"));
    container.querySelector("#nav-search")?.addEventListener("click", () => navigateTo("/search"));
    container.querySelector("#nav-profile")?.addEventListener("click", () => navigateTo("/profile"));

    loadRequests();

    async function loadRequests() {
        try {
            emptyMessage.textContent = "Loading...";

            const res = await fetch("/api/friend-requests", {
                credentials: "include"
            });

            const data = await res.json();

            if (!res.ok) {
                emptyMessage.textContent = data.message || "Error loading requests";
                return;
            }

            if (data.requests.length === 0) {
                emptyMessage.textContent = "No friend requests.";
                requestsContainer.innerHTML = "";
                return;
            }

            emptyMessage.textContent = "";
            requestsContainer.innerHTML = "";

            data.requests.forEach((req: any) => {
                const card = document.createElement("div");
                card.className = "flex items-center justify-between p-4 bg-gray-100 rounded-xl mb-3";

                card.innerHTML = `
                <div class="flex items-center gap-3">
                    <img src="/uploads/${req.avatar ? req.avatar : 'default.png'}"
                    class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <p class="font-semibold">${req.login}</p>
                        <p class="text-gray-500 text-sm">${req.email}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="bg-green-600 text-white px-3 py-1 rounded-lg hover:opacity-60 transition" id="accept-btn-${req.id}">
                        Accept
                    </button>
                    <button class="bg-red-600 text-white px-3 py-1 rounded-lg hover:opacity-60 transition" id="reject-btn-${req.id}">
                        Reject
                    </button>
                </div>
                `;

                requestsContainer.appendChild(card);

                const acceptBtn = card.querySelector(`#accept-btn-${req.id}`) as HTMLButtonElement;
                const rejectBtn = card.querySelector(`#reject-btn-${req.id}`) as HTMLButtonElement;

                if (acceptBtn) {
                    acceptBtn.addEventListener("click", async () => {
                        await handleRequest(req.id, 'accept', card);
                    });
                }

                if (rejectBtn) {
                    rejectBtn.addEventListener("click", async () => {
                        await handleRequest(req.id, 'reject', card);
                    });
                }
            });

        }
        catch (err) {
            console.error("Load requests error:", err);
            emptyMessage.textContent = "Error loading requests.";
        }
    }

    async function handleRequest(requestId: number, action: 'accept' | 'reject', cardElement: HTMLElement) {
        try {
            const endpoint = action === 'accept' ? '/api/friend-accept' : '/api/friend-reject';

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ request_id: requestId })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || `Error ${action}ing request`);
                return;
            }

            cardElement.remove();
            alert(`Request ${action}ed successfully`);

            // If no more requests, show empty message
            if (requestsContainer.children.length === 0) {
                 emptyMessage.textContent = "No friend requests.";
            }

        }
        catch (err) {
            console.error(`${action} request error:`, err);
            alert(`Error ${action}ing request`);
        }
    }

    return { component: container };
}
