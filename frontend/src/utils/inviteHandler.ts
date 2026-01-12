import { navigateTo } from "../router.js";

export async function checkAndShowInvites() {
    try {
        // Prevent duplicate notifications
        if (document.getElementById('invite-notification')) return;

        const res = await fetch('/api/invites', { credentials: 'include', cache: 'no-store' });
        
        // 404 means no pending game, which is normal
        if (!res.ok) return; 

        const data = await res.json();
        if (!data.invites || data.invites.length === 0) return;

        const invite = data.invites[0];

        // Fetch friend details to show name
        let creatorName = "Unknown";
        try {
            const friendsRes = await fetch('/api/friends', { credentials: 'include' });
            if (friendsRes.ok) {
                const friendsData = await friendsRes.json();
                const friend = friendsData.friends.find((f: any) => f.id === invite.creatorId);
                if (friend) creatorName = friend.login;
            }
        } catch (e) {
            console.error("Failed to fetch friend details");
        }

        const notification = document.createElement('div');
        notification.id = 'invite-notification';
        notification.className = 'fixed top-24 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-bounce cursor-pointer border-2 border-white hover:bg-green-700 transition transform hover:scale-105';
        notification.innerHTML = `
            <span class="text-3xl">🏓</span>
            <div>
                <p class="font-bold text-lg">1v1 Invite!</p>
                <p class="text-sm text-green-100">from ${creatorName}</p>
            </div>
        `;

        notification.onclick = async () => {
            // Remove notification immediately upon interaction
            notification.remove();

            const accept = confirm(`Accept 1v1 invite from ${creatorName}?`);
            if (!accept) return;

            try {
                const acceptRes = await fetch('/api/invite/accept', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inviteId: invite.id }),
                    credentials: 'include'
                });

                if (acceptRes.ok) {
                    const acceptData = await acceptRes.json();
                    navigateTo(`/remote-game?gameId=${acceptData.gameId}`);
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
