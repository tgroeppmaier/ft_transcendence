import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrateTournaments() {
	try {
		const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/users.db')

		if (!fs.existsSync(dbPath)) {
			console.log(`Database does not exist at ${dbPath}, skipping migration`)
			process.exit(0)
		}

		console.log(`Migrating database at: ${dbPath}`)

		const db = await open({
			filename: dbPath,
			driver: sqlite3.Database
		})

		// Check if tournaments table already exists
		const tableExists = await db.get(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='tournaments'"
		)

		if (tableExists) {
			console.log('Table "tournaments" already exists, skipping migration')
			await db.close()
			process.exit(0)
		}

		// Create tournaments table
		await db.exec(`CREATE TABLE IF NOT EXISTS tournaments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		placement INTEGER NOT NULL,
		played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_tournaments_user ON tournaments(user_id);`)

		console.log('Table "tournaments" created successfully')

		await db.close()
		process.exit(0)
	}
	catch (err) {
		console.error('Database migration error:', err)
		process.exit(1)
	}
}

migrateTournaments()
