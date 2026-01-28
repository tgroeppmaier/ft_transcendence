import { navigateTo } from "../router.js";
import { escapeHtml } from "../utils/escapeHtml.js";

export function FriendsView() {
    const container = document.createElement("div");
    container.className = "max-w-lg mx-auto px-4 mt-8";
    container.innerHTML = `
        <h1 class="text-3xl font-bold mb-6">Your Friends</h1>
        <div class="flex gap-4 mb-6">
             <button id="nav-menu" class="text-blue-800 font-semibold hover:opacity-60 transition">Back to Menu</button>
             <button id="nav-search" class="text-blue-800 font-semibold hover:opacity-60 transition">Search Users</button>
             <button id="nav-requests" class="text-blue-800 font-semibold hover:opacity-60 transition">Requests</button>
             <button id="nav-profile" class="text-blue-800 font-semibold hover:opacity-60 transition">Profile</button>
        </div>
        <div id="friendsMessage" class="text-gray-600 mb-4"></div>
        <div id="friendsList"></div>
    `;

    const friendsList = container.querySelector("#friendsList") as HTMLElement;
    const message = container.querySelector("#friendsMessage") as HTMLElement;

    // Navigation handlers
    container.querySelector("#nav-menu")?.addEventListener("click", () => navigateTo("/menu"));
    container.querySelector("#nav-search")?.addEventListener("click", () => navigateTo("/search"));
    container.querySelector("#nav-requests")?.addEventListener("click", () => navigateTo("/requests"));
    container.querySelector("#nav-profile")?.addEventListener("click", () => navigateTo("/profile"));

    loadFriends();
    const intervalId = setInterval(loadFriends, 5000);

    async function loadFriends() {
        try {
            // Only show "Loading..." on first load if list is empty, otherwise silent update
            if (friendsList.children.length === 0 && message.textContent !== "") {
                 message.textContent = "Loading...";
            }
            
            const res = await fetch("/db/friends", {
                credentials: "include"
            });
            const data = await res.json();
            if (!res.ok) {
                message.textContent = data.message || "Error loading friends";
                return;
            }
            if (data.friends.length === 0) {
                message.textContent = "You have no friends yet.";
                friendsList.innerHTML = "";
                return;
            }
            message.textContent = "";
            
            // Re-render list (simple approach, could be diffed for optimization but this is fine)
            friendsList.innerHTML = "";
            data.friends.forEach((friend: any) => {
                const card = document.createElement("div");
                card.className = "flex items-center justify-between p-4 bg-gray-100 rounded-xl mb-3";

                const isOnline = friend.onlineStatus === "online";
                const statusColor = isOnline ? "bg-green-500" : "bg-gray-400";
                const statusText = isOnline ? "Online" : "Offline";
                const safeLogin = escapeHtml(friend.login ?? "");

                card.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <img src="/uploads/${friend.avatar ? friend.avatar : 'default.png'}"
                        class="w-12 h-12 rounded-full object-cover">
                        <div class="${statusColor} w-3 h-3 rounded-full absolute bottom-0 right-0 border-2 border-white" title="${statusText}"></div>
                    </div>
                    <div>
                        <p class="font-semibold">${safeLogin}</p>
                        <p class="text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'} font-medium">${statusText}</p>
                    </div>
                </div>
                <button class="bg-red-600 text-white px-3 py-1 rounded-lg hover:opacity-60 transition" id="remove-btn-${friend.id}">
                    Remove
                </button>
                `;
                friendsList.appendChild(card);
                const removeBtn = card.querySelector(`#remove-btn-${friend.id}`) as HTMLButtonElement;
                if (removeBtn) {
                    removeBtn.addEventListener("click", async () => {
                        await removeFriend(friend.id, card);
                    });
                }
            });
        }
        catch (err) {
            // Don't overwrite message on poll fail
        }
    }

    async function removeFriend(friendId: number, cardElement: HTMLElement) {
        try {
            const res = await fetch("/db/friend-remove", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ friend_id: friendId })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Error removing friend");
                return;
            }
            cardElement.remove();
            alert("Friend removed");
            loadFriends(); // Refresh list immediately
        }
        catch (err) {
            alert("Error removing friend");
        }
    }

    return { component: container, cleanup: () => clearInterval(intervalId) };
}
