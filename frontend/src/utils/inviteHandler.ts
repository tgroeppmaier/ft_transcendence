import { navigateTo } from "../router.js";

export async function checkAndShowInvites() {
    try {
        // Prevent duplicate notifications
        if (document.getElementById('invite-notification')) return;

        const res = await fetch('/api/game-pending', { credentials: 'include' });
        
        // 404 means no pending game, which is normal
        if (!res.ok) return; 

        const game = await res.json();
        if (!game || !game.id) return;

        const notification = document.createElement('div');
        notification.id = 'invite-notification';
        notification.className = 'fixed top-24 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-bounce cursor-pointer border-2 border-white hover:bg-green-700 transition transform hover:scale-105';
        notification.innerHTML = `
            <span class="text-3xl">🏓</span>
            <div>
                <p class="font-bold text-lg">1v1 Invite!</p>
                <p class="text-sm text-green-100">from ${game.player1_login}</p>
            </div>
        `;

        notification.onclick = async () => {
            // Remove notification immediately upon interaction
            notification.remove();

            const accept = confirm(`Accept 1v1 invite from ${game.player1_login}?`);
            if (!accept) return;

            try {
                const acceptRes = await fetch(`/api/game/${game.id}/accept`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (acceptRes.ok) {
                    navigateTo(`/remote-game?gameId=${game.game_code}`);
                } else {
                    const err = await acceptRes.json();
                    alert(err.message || "Failed to join game");
                }
            } catch (e) {
                console.error(e);
                alert("Error accepting invite");
            }
        };

        document.body.appendChild(notification);

    } catch (e) {
        // Silent fail for background checks
        console.error("Invite check failed", e);
    }
}
