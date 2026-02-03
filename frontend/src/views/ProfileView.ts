import { navigateTo } from "../router.js";
import { escapeHtml } from "../utils/escapeHtml.js";

export function ProfileView() {
	const container = document.createElement("div");
	container.className = "max-w-lg mx-auto p-4";
	container.innerHTML = `
	<div class="mb-4">
	<button id="back-to-menu" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">Back to Menu</button>
	</div>

	<!-- Personal account -->
	<section class="bg-white rounded-2xl p-5 mb-8 text-center shadow">
	<h2 class="text-2xl font-semibold mb-4">Personal account</h2>
	<div id="avatarBlock" class="mb-5">
	<img id="avatarImg" src="/uploads/default.png" class="w-[120px] h-[120px] rounded-full object-cover mx-auto">
	</div>
	<p id="Welcome" class="mb-4 text-lg">Loading...</p>
	<form>
	<button id="logoutBtn" type="button" class="bg-blue-800 text-white py-2 px-4 rounded-lg hover:opacity-50 transition">
	Log out
	</button>
	</form>
	</section>

	<!-- Game Statistics -->
	<section class="bg-white rounded-2xl p-5 mb-8 shadow">
	<h2 class="text-2xl font-semibold mb-4">Game Statistics</h2>
	<div class="grid grid-cols-2 gap-4 mb-4">
	<div class="bg-green-50 p-4 rounded-lg text-center">
	<p class="text-gray-600 text-sm">Wins</p>
	<p id="winsCount" class="text-2xl font-bold text-green-600">0</p>
	</div>
	<div class="bg-red-50 p-4 rounded-lg text-center">
	<p class="text-gray-600 text-sm">Losses</p>
	<p id="lossesCount" class="text-2xl font-bold text-red-600">0</p>
	</div>
	<div class="bg-blue-50 p-4 rounded-lg text-center">
	<p class="text-gray-600 text-sm">Draws</p>
	<p id="drawsCount" class="text-2xl font-bold text-blue-600">0</p>
	</div>
	<div class="bg-purple-50 p-4 rounded-lg text-center">
	<p class="text-gray-600 text-sm">Total Games</p>
	<p id="totalGamesCount" class="text-2xl font-bold text-purple-600">0</p>
	</div>
	</div>
	<div class="bg-gray-50 p-4 rounded-lg text-center">
	<p class="text-gray-600 text-sm">Win Rate</p>
	<p id="winRate" class="text-xl font-bold text-gray-800">0%</p>
	</div>
	<div class="space-y-2 mt-2">
	<div class="flex items-center">
	<span class="w-16 text-sm">Wins</span>
	<div class="flex-1 h-4 bg-gray-200 rounded">
	<div id="winsBar" class="h-4 bg-green-600 rounded" class="w-0"></div>
	</div>
	<span id="winsPercent" class="w-10 text-right text-sm ml-2">0%</span>
	</div>

	<div class="flex items-center">
	<span class="w-16 text-sm">Losses</span>
	<div class="flex-1 h-4 bg-gray-200 rounded">
	<div id="lossesBar" class="h-4 bg-red-600 rounded" class="w-0"></div>
	</div>
	<span id="lossesPercent" class="w-10 text-right text-sm ml-2">0%</span>
	</div>

	<div class="flex items-center">
	<span class="w-16 text-sm">Draws</span>
	<div class="flex-1 h-4 bg-gray-200 rounded">
	<div id="drawsBar" class="h-4 bg-blue-600 rounded" class="w-0"></div>
	</div>
	<span id="drawsPercent" class="w-10 text-right text-sm ml-2">0%</span>
	</div>
	</div>
	</section>

	<!-- Match History -->
	<section class="bg-white rounded-2xl p-5 mb-8 shadow">
	<h2 class="text-2xl font-semibold mb-4">Match History</h2>
	<div id="matchHistoryList" class="flex flex-col gap-3">
	<p class="text-gray-500 text-center">Loading history...</p>
	</div>
	</section>

	<!-- Change personal data -->
	<section class="bg-white rounded-2xl p-5 mb-8 shadow">
	<h2 class="text-2xl font-semibold mb-4">Change personal data</h2>
	<form id="editForm" class="flex flex-col gap-3">
	<label class="flex flex-col text-left">
	<span class="mb-1">Login:</span>
	<input id="loginInput" name="login" type="text" required pattern="[a-zA-Z0-9_]+" minlength="3" maxlength="20"
	title="Only letters, numbers and underscore"
	class="p-2 rounded-lg border border-gray-400 w-full outline-none" />
	</label>

	<label class="flex flex-col text-left">
	<span class="mb-1">Email:</span>
	<input id="emailInput" name="email" type="email" required minlength="3" maxlength="20"
	class="p-2 rounded-lg border border-gray-400 w-full outline-none" />
	</label>

	<label class="flex flex-col text-left">
	<span class="mb-1">New password:</span>
	<input id="passwordInput" name="password" type="password" minlength="6" maxlength="10" placeholder="Leave empty to keep current"
	class="p-2 rounded-lg border border-gray-400 w-full outline-none" />
	</label>

	<button type="submit" class="bg-blue-800 text-white py-2 rounded-lg w-full hover:opacity-50 transition">Save</button>
	<button id="deleteProfileBtn" type="button" class="bg-red-600 text-white py-2 rounded-lg w-full hover:opacity-50 transition">Delete profile</button>
	</form>
	<p id="editMessage" class="mt-3 text-red-600"></p>
	</section>

	<!-- Avatar settings -->
	<section class="bg-white rounded-2xl p-5 mb-8 shadow">
	<h2 class="text-2xl font-semibold mb-4">Avatar settings</h2>
	<form id="avatarForm" enctype="multipart/form-data" class="flex flex-col gap-3">
	<input type="file" name="avatar" accept="image/*" class="border border-gray-400 rounded-lg p-2" required>
	<button type="submit" class="bg-blue-800 text-white py-2 rounded-lg w-full hover:opacity-50 transition">Upload avatar</button>
	<button id="deleteAvatarBtn" type="button" class="bg-red-600 text-white py-2 rounded-lg w-full hover:opacity-50 transition">Delete avatar</button>
	</form>
	<p id="avatarMessage" class="mt-3 text-red-600"></p>
	</section>
	`;

	const backBtn = container.querySelector("#back-to-menu") as HTMLButtonElement;
	backBtn.addEventListener("click", () => navigateTo("/menu"));

	let isSubmitting = false;

	loadProfile();

	async function loadProfile() {
		try {
			const res = await fetch('/db/profile', { credentials: 'include' });
			let data;
			try {
				data = await res.json();
			} catch {
				navigateTo('/login');
				return;
			}

			if (!data.success) {
				navigateTo('/login');
				return;
			}

			const welcomeEl = container.querySelector('#Welcome');
			if (welcomeEl) welcomeEl.textContent = "Welcome, " + data.login + "!";

			const avatarEl = container.querySelector('#avatarImg') as HTMLImageElement;
			if (avatarEl) {
				avatarEl.src = data.avatar
					? '/uploads/' + encodeURIComponent(data.avatar)
					: '/uploads/default.png';
			}

			const loginInput = container.querySelector('#loginInput') as HTMLInputElement;
			const emailInput = container.querySelector('#emailInput') as HTMLInputElement;

			if (loginInput) loginInput.value = data.login;
			if (emailInput) emailInput.value = data.email;
			updateGameStats(data);

			await loadMatchHistory(data);
		}
		catch (err) {
			navigateTo('/login');
		}
	}

	async function loadMatchHistory(currentUser: any) {
		try {
			// Fetch both match history and tournament history
			const [matchRes, tournamentRes] = await Promise.all([
				fetch('/db/match-history', { credentials: 'include' }),
				fetch('/db/tournament-history', { credentials: 'include' })
			]);

			let matchData, tournamentData;
			try {
				matchData = await matchRes.json();
				tournamentData = await tournamentRes.json();
			} catch {
				const listEl = container.querySelector('#matchHistoryList') as HTMLElement;
				if (listEl) {
					listEl.innerHTML = '<p class="text-gray-500 text-center">No matches or tournaments played yet.</p>';
				}
				return;
			}

			if (!matchData.success || !tournamentData.success) {
				const listEl = container.querySelector('#matchHistoryList') as HTMLElement;
				if (listEl) {
					listEl.innerHTML = '<p class="text-gray-500 text-center">No matches or tournaments played yet.</p>';
				}
				return;
			}

			const listEl = container.querySelector('#matchHistoryList') as HTMLElement;

			const matches = matchData.history || [];
			const tournaments = tournamentData.tournaments || [];

			// Combine and sort by date
			const combined = [
				...matches.map((m: any) => ({ ...m, type: 'match' })),
					...tournaments.map((t: any) => ({ ...t, type: 'tournament' }))
			].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());

			if (combined.length > 0) {
				listEl.innerHTML = combined.map((item: any) => {
					const date = new Date(item.played_at).toLocaleDateString();

					if (item.type === 'tournament') {
						// Tournament entry
						return `
						<div class="flex justify-between items-center p-3 rounded-lg bg-purple-50 border border-purple-200">
						<div class="text-sm text-gray-500">${date}</div>
						<div class="font-semibold flex items-center">
						<span class="mr-2">Local Tournament</span>
						<span class="text-purple-600 font-bold text-xs uppercase ml-2">Place ${item.placement}</span>
						</div>
						</div>
						`;
					} else {
						// Regular match entry
						let resultClass = 'bg-gray-50';
						let resultText = '';
						const safeP1 = escapeHtml(item.p1_login ?? '');
						const safeP2 = escapeHtml(item.p2_login ?? '');

						if (item.winner_id) {
							if (item.winner_id === currentUser.id) {
								resultClass = 'bg-green-50 border border-green-200';
								resultText = '<span class="text-green-600 font-bold text-xs uppercase ml-2">Win</span>';
							} else {
								resultClass = 'bg-red-50 border border-red-200';
								resultText = '<span class="text-red-600 font-bold text-xs uppercase ml-2">Loss</span>';
							}
						} else if (item.score_player1 === item.score_player2) {
							resultClass = 'bg-blue-50 border border-blue-200';
							resultText = '<span class="text-blue-600 font-bold text-xs uppercase ml-2">Draw</span>';
						}

						return `
						<div class="flex justify-between items-center p-3 rounded-lg ${resultClass}">
						<div class="text-sm text-gray-500">${date}</div>
						<div class="font-semibold flex items-center">
						${safeP1} <span class="text-blue-600 mx-1">${item.score_player1}</span> - <span class="text-blue-600 mx-1">${item.score_player2}</span> ${safeP2}
						${resultText}
						</div>
						</div>
						`;
					}
				}).join('');
			} else {
				listEl.innerHTML = '<p class="text-gray-500 text-center">No matches or tournaments played yet.</p>';
			}
		}
		catch (err) {
			// Silently handle error - just show empty state
			const listEl = container.querySelector('#matchHistoryList') as HTMLElement;
			if (listEl) {
				listEl.innerHTML = '<p class="text-gray-500 text-center">No matches or tournaments played yet.</p>';
			}
		}
	}

	function updateGameStats(data: any): void {
		const wins = data.wins || 0;
		const losses = data.losses || 0;
		const draws = data.draws || 0;
		const totalGames = data.total_games || 0;

		const winsEl = container.querySelector('#winsCount');
		const lossesEl = container.querySelector('#lossesCount');
		const drawsEl = container.querySelector('#drawsCount');
		const totalEl = container.querySelector('#totalGamesCount');
		const winRateEl = container.querySelector('#winRate');

		if (winsEl) winsEl.textContent = wins.toString();
		if (lossesEl) lossesEl.textContent = losses.toString();
		if (drawsEl) drawsEl.textContent = draws.toString();
		if (totalEl) totalEl.textContent = totalGames.toString();

		const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
		if (winRateEl) winRateEl.textContent = winRate + '%';
		updateBars(wins, losses, draws, totalGames);
	}

	function updateBars(wins: number, losses: number, draws: number, totalGames: number) {
		const winPercent = totalGames ? Math.round((wins / totalGames) * 100) : 0;
		const lossPercent = totalGames ? Math.round((losses / totalGames) * 100) : 0;
		const drawPercent = totalGames ? Math.round((draws / totalGames) * 100) : 0;

		(document.getElementById('winsBar') as HTMLElement).style.width = winPercent + '%';
		(document.getElementById('winsPercent') as HTMLElement).textContent = winPercent + '%';

		(document.getElementById('lossesBar') as HTMLElement).style.width = lossPercent + '%';
		(document.getElementById('lossesPercent') as HTMLElement).textContent = lossPercent + '%';

		(document.getElementById('drawsBar') as HTMLElement).style.width = drawPercent + '%';
		(document.getElementById('drawsPercent') as HTMLElement).textContent = drawPercent + '%';
	}

	const logoutBtn = container.querySelector('#logoutBtn');
	if (logoutBtn) {
		logoutBtn.addEventListener('click', async () => {
			try {
				await fetch('/db/logout', {
					method: 'POST',
					credentials: 'include'
				});
				navigateTo('/login');
			}
			catch (err) {
				navigateTo('/login');
			}
		});
	}

	const editForm = container.querySelector('#editForm') as HTMLFormElement;
	if (editForm) {
		editForm.addEventListener('submit', async (e: Event) => {
			e.preventDefault();
			if (isSubmitting) return;
			isSubmitting = true;

			try {
				const loginInput = container.querySelector('#loginInput') as HTMLInputElement;
				const emailInput = container.querySelector('#emailInput') as HTMLInputElement;
				const passwordInput = container.querySelector('#passwordInput') as HTMLInputElement;

				const body = {
					login: loginInput?.value || '',
					email: emailInput?.value || '',
					password: passwordInput?.value || ''
				};

				const res = await fetch('/db/profile', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
					credentials: 'include'
				});

				const messageEl = container.querySelector('#editMessage');

				let msg;
				try {
					msg = await res.json();
				} catch {
					msg = { success: false, message: 'Failed to update profile' };
				}

				if (messageEl) messageEl.textContent = msg.message || 'Update failed';

				if (msg.success) {
					await loadProfile();
				}
			}
			catch (err) {
				const messageEl = container.querySelector('#editMessage');
				if (messageEl) messageEl.textContent = 'Error updating profile';
			}
			finally {
				isSubmitting = false;
			}
		});
	}

	const avatarForm = container.querySelector('#avatarForm') as HTMLFormElement;
	if (avatarForm) {
		avatarForm.addEventListener('submit', async (e: Event) => {
			e.preventDefault();
			if (isSubmitting) return;
			isSubmitting = true;

			try {
				const fileInput = (e.target as HTMLFormElement).querySelector('input[name="avatar"]') as HTMLInputElement;
				const file = fileInput?.files?.[0];
				if (!file) {
					const msgEl = container.querySelector('#avatarMessage');
					if (msgEl) msgEl.textContent = 'Please select a file';
					isSubmitting = false;
					return;
				}

				if (file.size > 2 * 1024 * 1024) {
					const msgEl = container.querySelector('#avatarMessage');
					if (msgEl) msgEl.textContent = 'File too large! Max 2MB';
					isSubmitting = false;
					return;
				}

				const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
				if (!allowedTypes.includes(file.type)) {
					const msgEl = container.querySelector('#avatarMessage');
					if (msgEl) msgEl.textContent = 'Invalid file type! Only JPEG, PNG, WebP allowed';
					isSubmitting = false;
					return;
				}

				const formData = new FormData();
				formData.append('avatar', file);

				const res = await fetch('/db/avatar', {
					method: 'POST',
					body: formData,
					credentials: 'include'
				});

				const msgEl = container.querySelector('#avatarMessage');

				let msg;
				try {
					msg = await res.json();
				} catch {
					msg = { success: false, message: 'Failed to upload avatar' };
				}

				if (msgEl) msgEl.textContent = msg.message || 'Upload failed';

				if (msg.success) {
					await loadProfile();
					fileInput.value = '';
				}
			}
			catch (err) {
				const msgEl = container.querySelector('#avatarMessage');
				if (msgEl) msgEl.textContent = 'Error uploading avatar';
			}
			finally {
				isSubmitting = false;
			}
		});
	}

	const deleteAvatarBtn = container.querySelector('#deleteAvatarBtn');
	if (deleteAvatarBtn) {
		deleteAvatarBtn.addEventListener('click', async () => {
			if (!confirm('Delete your avatar?')) return;

			try {
				const res = await fetch('/db/avatar', {
					method: 'DELETE',
					credentials: 'include'
				});

				const msgEl = container.querySelector('#avatarMessage');

				let msg;
				try {
					msg = await res.json();
				} catch {
					msg = { success: false, message: 'Failed to delete avatar' };
				}

				if (msgEl) msgEl.textContent = msg.message || 'Delete failed';

				if (msg.success) {
					await loadProfile();
				}
			}
			catch (err) {
				const msgEl = container.querySelector('#avatarMessage');
				if (msgEl) msgEl.textContent = 'Error deleting avatar';
			}
		});
	}

	const deleteProfileBtn = container.querySelector('#deleteProfileBtn');
	if (deleteProfileBtn) {
		deleteProfileBtn.addEventListener('click', async () => {
			if (!confirm('Are you sure you want to delete your profile? This cannot be undone.')) {
				return;
			}

			try {
				const res = await fetch('/db/profile', {
					method: 'DELETE',
					credentials: 'include'
				});

				let msg;
				try {
					msg = await res.json();
				} catch {
					msg = { success: false };
				}

				if (msg.success) {
					navigateTo('/');
				} else {
					alert('Failed to delete profile');
				}
			}
			catch (err) {
				alert('Error deleting profile');
			}
		});
	}

	return { component: container };
}
