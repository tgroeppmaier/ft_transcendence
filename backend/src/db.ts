const DB_URL = "http://database:3000/internal";

export const db = {
  checkFriendship: async (user1_id: number, user2_id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${DB_URL}/check-friendship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user1_id, user2_id })
      });
      const data = await res.json() as { areFriends: boolean };
      return data.areFriends;
    } catch (err) {
      console.error("DB checkFriendship failed:", err);
      throw err;
    }
  },

  saveMatch: async (data: { player1_id: number, player2_id: number, score1: number, score2: number, winner_id: number | null }) => {
    try {
      await fetch(`${DB_URL}/match-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error("DB saveMatch failed:", err);
    }
  }
};
