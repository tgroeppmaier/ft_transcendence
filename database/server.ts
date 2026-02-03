import Fastify from 'fastify'
import path from 'path'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import formbody from '@fastify/formbody'
import cors from '@fastify/cors'
import { openDB } from './database.js'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fetch from "node-fetch"
import { pipeline } from 'stream'
import { promisify } from 'util'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import sharp from 'sharp'

const pump = promisify(pipeline)
const fsUnlink = promisify(fs.unlink)
const fsAccess = promisify(fs.access)
const fsMkdir = promisify(fs.mkdir)
const fsOpen = promisify(fs.open)
const fsRead = promisify(fs.read)
const fsClose = promisify(fs.close)

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://localhost:8443/db/auth/google/callback"
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
	console.error("FATAL: JWT_SECRET environment variable is required.")
	process.exit(1)
}

const fastify = Fastify({
	logger: true,
	trustProxy: true
})

await fastify.register(rateLimit, {
	max: 500,
	timeWindow: '15 minutes',
	skipOnError: true,
	enableDraftSpec: true,
	allowList: (req) => {
		return req.url.startsWith('/uploads')
	}
})

fastify.register(fastifyStatic, {
	root: UPLOADS_DIR,
	prefix: '/uploads/',
})

fastify.register(helmet, {
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],  // оставили для Tailwind
			fontSrc: ["'self'", "https://fonts.gstatic.com"],
			imgSrc: ["'self'", "data:", "blob:"],
			scriptSrc: ["'self'"],  // ← УБРАЛИ 'unsafe-inline' (это главное!)
			connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com", "https://www.googleapis.com"]
		}
	},
	crossOriginEmbedderPolicy: false
})

fastify.register(formbody)
fastify.register(cors, {
	origin: (origin, callback) => {
		const allowedOrigins = [
			process.env.FRONTEND_URL || 'https://10.11.6.4.nip.io:8443', 
			'http://localhost:8443',            
			'https://localhost:8443'  
		]
		if (!origin) {
			return callback(null, true)
		}
		if (allowedOrigins.includes(origin)) {
			callback(null, true)
		} else {
			callback(new Error('Not allowed by CORS'))
		}
	},
	credentials: true
})

fastify.register(cookie, { secret: JWT_SECRET })
fastify.register(jwt, { secret: JWT_SECRET })
fastify.register(multipart, {
	limits: {
		fileSize: 2 * 1024 * 1024 // 2 MB
	}
})


fastify.decorate("authenticate", async (request, reply) => {
	try {
		const token = request.cookies?.token
		if (!token) return reply.code(200).send({ success: false, message: 'Not authenticated' })
		const decoded = fastify.jwt.verify(token)
		request.user = decoded

		// Ensure user is marked online if they are making requests
		const db = await openDB()
		await db.run("UPDATE users SET onlineStatus = 'online' WHERE id = ?", [decoded.id])
		await db.close()
	}
	catch (err) {
		return reply.code(200).send({ success: false, message: 'Authentication error' })
	}
})

async function ensureUploadsDir() {
	try {
		await fsAccess(UPLOADS_DIR)
	}
	catch {
		await fsMkdir(UPLOADS_DIR, { recursive: true })
	}
}

// Internal endpoint for game service to report results
fastify.post('/internal/match-result', async (request, reply) => {
	let db
	try {
		const { player1_id, player2_id, score1, score2, winner_id } = request.body

		db = await openDB()

		// 1. Insert into match_history
		await db.run(
			`INSERT INTO match_history (player1_id, player2_id, winner_id, score_player1, score_player2, played_at)
			VALUES (?, ?, ?, ?, ?, datetime('now'))`,
			[player1_id, player2_id, winner_id, score1, score2]
		)

		// 2. Update User Stats (Player 1)
		let p1Update = 'UPDATE users SET total_games = total_games + 1'
		if (player1_id === winner_id) p1Update += ', wins = wins + 1'
			else if (score1 === score2) p1Update += ', draws = draws + 1'
				else p1Update += ', losses = losses + 1'
					p1Update += ' WHERE id = ?'
		await db.run(p1Update, [player1_id])

		// 3. Update User Stats (Player 2)
		let p2Update = 'UPDATE users SET total_games = total_games + 1'
		if (player2_id === winner_id) p2Update += ', wins = wins + 1'
			else if (score1 === score2) p2Update += ', draws = draws + 1'
				else p2Update += ', losses = losses + 1'
					p2Update += ' WHERE id = ?'
		await db.run(p2Update, [player2_id])

		await db.close()
		return reply.code(200).send({ success: true, message: "Match recorded" })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error recording match" })
	}
})

fastify.post('/registration', {
	config: {
		rateLimit: {
			max: 50,
			timeWindow: '15 minutes'
		}
	}
}, async (request, reply) => {
	let db
	try {
		const { login, email, password } = request.body
		const onlineStatus = 'offline'
		if (!login || !email || !password)
			return reply.code(200).send({ success: false, message: 'All fields are mandatory!' })
		if (!/^[a-zA-Z0-9_]+$/.test(login))
			return reply.code(200).send({ success: false, message: 'Invalid login format!' })
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			return reply.code(200).send({ success: false, message: 'Invalid email format!' })
		if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
			return reply.code(200).send({ success: false, message: 'Invalid email format!' })
		}
		if (/<|>|script|javascript|onerror|onload/i.test(email)) {
			return reply.code(200).send({ success: false, message: 'Email contains invalid characters!' })
		}
		if (password.length < 6)
			return reply.code(200).send({ success: false, message: 'Password must be at least 6 characters!' })
		if (password.length > 10)
			return reply.code(200).send({ success: false, message: 'Password must be no longer than 10 characters!' })

		db = await openDB()
		const existingLogin = await db.get(`SELECT id FROM users WHERE login = ?`, [login])
		if (existingLogin) {
			await db.close()
			return reply.code(200).send({ success: false, message: 'This login is already taken!' })
		}
		const existingEmail = await db.get(`SELECT id FROM users WHERE email = ?`, [email])
		if (existingEmail) {
			await db.close()
			return reply.code(200).send({ success: false, message: 'This email is already taken!' })
		}
		request.log.info('Starting password hashing...')
		const hashedPassword = await bcrypt.hash(password, 10)
		request.log.info('Hashing successful.')
		await db.run('INSERT INTO users (login, email, password, onlineStatus, avatar) VALUES (?, ?, ?, ?, ?)', [login, email, hashedPassword, onlineStatus, 'default.png'])
		await db.close()
		return reply.code(200).send({ success: true, message: 'Registration successful!' })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: 'Registration error: ' + err.message })
	}
})

fastify.post('/login', {
	config: {
		rateLimit: {
			max: 100,
			timeWindow: '15 minutes'
		}
	}
}, async (request, reply) => {
	let db
	try {
		const { login, password } = request.body
		if (!login || !password)
			return reply.code(200).send({ success: false, message: 'Login and password required' })

		if (!/^[a-zA-Z0-9_]+$/.test(login))
			return reply.code(200).send({ success: false, message: 'Invalid login format!' })
		db = await openDB()
		const user = await db.get('SELECT * FROM users WHERE login = ?', [login])
		if (!user) {
			await db.close()
			return reply.code(200).send({ success: false, message: 'User not found' })
		}
		const match = await bcrypt.compare(password, user.password)
		if (!match) {
			await db.close()
			return reply.code(200).send({ success: false, message: 'Incorrect password' })
		}
		const token = fastify.jwt.sign(
			{ id: user.id, login: user.login },
			{ expiresIn: '6h' }
		)
		reply.setCookie('token', token, {
			httpOnly: true,
			sameSite: 'strict',
			path: '/',
			maxAge: 60 * 60 * 6,
			secure: true
		})
		await db.run('UPDATE users SET onlineStatus = ? WHERE id = ?', ['online', user.id])
		await db.close()
		return reply.code(200).send({ success: true, message: 'Login successful' })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: 'Login error: ' + err.message })
	}
})

fastify.get('/auth/status', async (request, reply) => {
	try {
		const token = request.cookies?.token
		if (!token) return reply.code(200).send({ success: true, user: null })

		const decoded = fastify.jwt.verify(token)

		const db = await openDB()
		const user = await db.get('SELECT id, login FROM users WHERE id = ?', [decoded.id])
		await db.close()

		if (!user) return reply.code(200).send({ success: true, user: null })

		return reply.code(200).send({ success: true, user: user })
	}
	catch (err) {
		return reply.code(200).send({ success: true, user: null })
	}
})

fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const { id } = request.user
		db = await openDB()
		await db.run('UPDATE users SET onlineStatus = ? WHERE id = ?', ['offline', id])
		await db.close()
		reply.clearCookie('token', { path: '/' })
		return reply.code(200).send({ success: true, message: 'Logged out' })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: 'Logout error' })
	}
})

fastify.get('/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const { id } = request.user
		db = await openDB()
		const u = await db.get('SELECT id, login, email, avatar, onlineStatus, wins, losses, draws, total_games FROM users WHERE id = ?', [id])
		await db.close()
		if (!u) return reply.code(200).send({ success: false, message: 'User not found' })
		return reply.code(200).send({ success: true, ...u })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: 'Error fetching profile' })
	}
})

fastify.put('/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const { login, email, password } = request.body || {}
		const { id } = request.user
		if (!login || !email) return reply.code(200).send({ success: false, message: 'Login and email required' })
		if (!/^[a-zA-Z0-9_]+$/.test(login)) return reply.code(200).send({ success: false, message: 'Invalid login characters' })
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply.code(200).send({ success: false, message: 'Invalid email' })
		if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
			return reply.code(200).send({ success: false, message: 'Invalid email format!' })
		}
		if (/<|>|script|javascript|onerror|onload/i.test(email)) {
			return reply.code(200).send({ success: false, message: 'Email contains invalid characters!' })
		}
		if (password && password.length < 6) return reply.code(200).send({ success: false, message: 'Password too short' })
		if (password && password.length > 10) return reply.code(200).send({ success: false, message: 'Password too long' })

		db = await openDB()
		const existingLogin = await db.get('SELECT id FROM users WHERE login = ? AND id != ?', [login, id])
		if (existingLogin) {
			await db.close()
			return reply.code(200).send({ success: false, message: 'Login is already taken' })
		}
		const existingEmail = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id])
		if (existingEmail) {
			await db.close()
			return reply.code(200).send({ success: false, message: 'Email is already taken' })
		}
		let sql, params
		if (password && password !== '') {
			const hashed = bcrypt.hashSync(password, 10)
			sql = 'UPDATE users SET login = ?, email = ?, password = ? WHERE id = ?'
			params = [login, email, hashed, id]
		}
		else {
			sql = 'UPDATE users SET login = ?, email = ? WHERE id = ?'
			params = [login, email, id]
		}
		await db.run(sql, params)
		await db.close()
		return reply.code(200).send({ success: true, message: 'Profile updated' })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: 'Update error' })
	}
})

fastify.delete('/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const { id } = request.user
		db = await openDB()
		const row = await db.get('SELECT avatar FROM users WHERE id = ?', [id])
		const oldAvatar = row?.avatar || ''
		if (oldAvatar && oldAvatar !== 'default.png') {
			const fp = path.join(UPLOADS_DIR, oldAvatar)
			try {
				await fsUnlink(fp)
			} catch (e) { /* ignore */ }
		}
		await db.run('DELETE FROM users WHERE id = ?', [id])
		await db.close()
		reply.clearCookie('token', { path: '/' })
		return reply.code(200).send({ success: true, message: 'Profile deleted' })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: 'Delete error' })
	}
})

fastify.get('/search', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const { id } = request.user
		const { query } = request.query

		if (!query || query.trim() === "") {
			return reply.code(200).send({ success: false, message: "Query is required", users: [] })
		}
		if (/<|>|script|javascript|onerror|onload/i.test(query)) {
			return reply.code(200).send({ success: false, message: "Invalid characters in search query", users: [] })
		}

		// Sanitize special LIKE characters
		const sanitizedQuery = query.replace(/[_%\\]/g, '\\$&');

		db = await openDB()
		const users = await db.all(
			`SELECT id, login, avatar, onlineStatus FROM users WHERE login LIKE ? ESCAPE '\\' AND id != ? LIMIT 30`,
				[`%${sanitizedQuery}%`, id]
		)
		await db.close()

		return reply.code(200).send({ success: true, users })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Search error" })
	}
})

fastify.post('/friend-request', {
	preHandler: [fastify.authenticate],
	config: {
		rateLimit: {
			max: 80,
			timeWindow: '1 hour'
		}
	}
}, async (request, reply) => {
	let db
	try {
		const { addressee_id } = request.body
		const requester_id = request.user.id

		request.log.info(`[Friend Request] Requester: ${requester_id}, Addressee: ${addressee_id}`)

		if (!addressee_id) {
			request.log.warn('[Friend Request] Missing addressee_id')
			return reply.code(200).send({ success: false, message: "Addressee ID is required" })
		}

		if (requester_id === addressee_id) {
			request.log.warn('[Friend Request] User tried to add themselves')
			return reply.code(200).send({ success: false, message: "You cannot add yourself" })
		}

		db = await openDB()

		const addressee = await db.get('SELECT id FROM users WHERE id = ?', [addressee_id])
		if (!addressee) {
			await db.close()
			return reply.code(200).send({ success: false, message: "User not found" })
		}

		const existingRequest = await db.get(
			`SELECT id, status FROM friends
			WHERE (requester_id = ? AND addressee_id = ?)
			OR (requester_id = ? AND addressee_id = ?)`,
				[requester_id, addressee_id, addressee_id, requester_id]
		)

		if (existingRequest) {
			await db.close()
			request.log.warn(`[Friend Request] Existing request found: ${JSON.stringify(existingRequest)}`)
			if (existingRequest.status === 'pending') {
				return reply.code(200).send({ success: false, message: "Friend request already sent" })
			} else if (existingRequest.status === 'accepted') {
				return reply.code(200).send({ success: false, message: "You are already friends" })
			}
		}

		await db.run(
			`INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, 'pending')`,
			[requester_id, addressee_id]
		)

		await db.close()
		return reply.code(200).send({ success: true, message: "Friend request sent" })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error sending friend request" })
	}
})

fastify.delete('/friend-remove', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const userId = request.user.id
		const { friend_id } = request.body

		if (!friend_id) {
			return reply.code(200).send({ success: false, message: "Friend ID is required" })
		}

		db = await openDB()

		const result = await db.run(
			`DELETE FROM friends
			WHERE (requester_id = ? AND addressee_id = ?)
			OR (requester_id = ? AND addressee_id = ?)`,
				[userId, friend_id, friend_id, userId]
		)

		await db.close()

		if (result.changes === 0) {
			return reply.code(200).send({ success: false, message: "Friend record not found" })
		}

		return reply.code(200).send({ success: true, message: "Friend removed" })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error removing friend" })
	}
})

fastify.get('/friends', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const userId = request.user.id
		db = await openDB()

		const friends = await db.all(
			`SELECT u.id, u.login, u.avatar, u.onlineStatus
			FROM users u
			WHERE (
				(SELECT status FROM friends WHERE requester_id = ? AND addressee_id = u.id) = 'accepted'
				OR
				(SELECT status FROM friends WHERE requester_id = u.id AND addressee_id = ?) = 'accepted'
			)`,
			[userId, userId]
		)

		await db.close()
		return reply.code(200).send({ success: true, friends: friends || [] })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error loading friends" })
	}
})

fastify.post('/friend-accept', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const { request_id } = request.body
		const user_id = request.user.id

		if (!request_id) {
			return reply.code(200).send({ success: false, message: "Request ID is required" })
		}

		db = await openDB()

		const friendRequest = await db.get(
			'SELECT id, requester_id FROM friends WHERE id = ? AND addressee_id = ? AND status = "pending"',
			[request_id, user_id]
		)

		if (!friendRequest) {
			await db.close()
			return reply.code(200).send({ success: false, message: "Friend request not found" })
		}

		await db.run(
			'UPDATE friends SET status = "accepted" WHERE id = ?',
			[request_id]
		)

		const friend = await db.get(
			'SELECT id, login, email, avatar, onlineStatus FROM users WHERE id = ?',
			[friendRequest.requester_id]
		)

		await db.close()
		return reply.code(200).send({ success: true, message: "Friend request accepted", friend })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error accepting friend request" })
	}
})

fastify.post('/friend-reject', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const { request_id } = request.body
		const user_id = request.user.id

		if (!request_id) {
			return reply.code(200).send({ success: false, message: "Request ID is required" })
		}

		db = await openDB()

		const friendRequest = await db.get(
			'SELECT id FROM friends WHERE id = ? AND addressee_id = ? AND status = "pending"',
			[request_id, user_id]
		)

		if (!friendRequest) {
			await db.close()
			return reply.code(200).send({ success: false, message: "Friend request not found" })
		}

		await db.run('DELETE FROM friends WHERE id = ?', [request_id])

		await db.close()
		return reply.code(200).send({ success: true, message: "Friend request rejected" })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error rejecting friend request" })
	}
})

fastify.get('/friend-requests', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const user_id = request.user.id
		db = await openDB()

		const requests = await db.all(
			`SELECT
			f.id,
			f.requester_id,
			u.id as user_id,
			u.login,
			u.avatar,
			u.onlineStatus
			FROM friends f
			JOIN users u ON f.requester_id = u.id
			WHERE f.addressee_id = ? AND f.status = 'pending'
			ORDER BY f.created_at DESC`,
			[user_id]
		)

		await db.close()
		return reply.code(200).send({ success: true, requests: requests || [] })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error fetching friend requests" })
	}
})

fastify.get('/match-history', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const userId = request.user.id
		db = await openDB()

		const history = await db.all(
			`SELECT
			mh.played_at,
			mh.score_player1,
			mh.score_player2,
			mh.winner_id,
			u1.login as p1_login,
			u2.login as p2_login
			FROM match_history mh
			JOIN users u1 ON mh.player1_id = u1.id
			JOIN users u2 ON mh.player2_id = u2.id
			WHERE mh.player1_id = ? OR mh.player2_id = ?
				ORDER BY mh.played_at DESC
			LIMIT 20`,
			[userId, userId]
		)

		await db.close()
		return reply.code(200).send({ success: true, history: history || [] })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error fetching history" })
	}
})

fastify.post('/tournament-result', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const userId = request.user.id
		const { placement } = request.body

		if (!placement || placement < 1 || placement > 4) {
			return reply.code(200).send({ success: false, message: "Invalid placement. Must be between 1 and 4." })
		}

		db = await openDB()

		// Anti-abuse measures:
		// 1. Check time since last tournament (minimum 3 minutes between tournaments)
		const lastTournament = await db.get(
			`SELECT played_at FROM tournaments
			WHERE user_id = ?
				ORDER BY played_at DESC
			LIMIT 1`,
			[userId]
		)

		if (lastTournament) {
			const lastTime = new Date(lastTournament.played_at).getTime()
			const now = new Date().getTime()
			const minutesSince = (now - lastTime) / 1000 / 60

			if (minutesSince < 3) {
				await db.close()
				return reply.code(200).send({
					success: false,
					message: "Please wait at least 3 minutes between tournament submissions."
				})
			}
		}

		// 2. Check daily limit (max 20 tournaments per day)
		const todayStart = new Date()
		todayStart.setHours(0, 0, 0, 0)

		const tournamentsToday = await db.get(
			`SELECT COUNT(*) as count FROM tournaments
			WHERE user_id = ?
				AND datetime(played_at) >= datetime(?)`,
				[userId, todayStart.toISOString()]
		)

		if (tournamentsToday.count >= 20) {
			await db.close()
			return reply.code(200).send({
				success: false,
				message: "Daily tournament limit reached (20 per day)."
			})
		}

		// 3. Save the result
		await db.run(
			`INSERT INTO tournaments (user_id, placement, played_at)
			VALUES (?, ?, datetime('now'))`,
			[userId, placement]
		)

		await db.close()
		return reply.code(200).send({ success: true, message: "Tournament result saved" })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error saving tournament result" })
	}
})

fastify.get('/tournament-history', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const userId = request.user.id
		db = await openDB()

		const tournaments = await db.all(
			`SELECT placement, played_at
			FROM tournaments
			WHERE user_id = ?
				ORDER BY played_at DESC
			LIMIT 20`,
			[userId]
		)

		await db.close()
		return reply.code(200).send({ success: true, tournaments: tournaments || [] })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: "Error fetching tournament history" })
	}
})

fastify.post('/avatar', {
	preHandler: [fastify.authenticate],
	config: {
		rateLimit: {
			max: 30,
			timeWindow: '1 hour'
		}
	}
}, async (request, reply) => {
	let db
	let id
	try {
		id = request.user.id
	} catch (err) {
		return reply.code(200).send({ success: false, message: 'Authentication error' })
	}

	await ensureUploadsDir()

	const data = await request.file()
	if (!data) return reply.code(200).send({ success: false, message: 'No file uploaded' })

	const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
	if (!allowedMimeTypes.includes(data.mimetype)) {
		return reply.code(200).send({ success: false, message: 'Invalid image format' })
	}

	const newName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`
	const destPath = path.join(UPLOADS_DIR, newName)

	try {
		const fileBuffer = await data.toBuffer()

		if (data.file.truncated) {
			return reply.code(200).send({ success: false, message: 'File too large! Max 2MB' })
		}

		await sharp(fileBuffer)
		.resize(500, 500, { fit: 'cover' })
		.webp({ quality: 80 })       
		.rotate()                          
		.timeout({ seconds: 10 })          
		.toFile(destPath)           

		db = await openDB()
		const row = await db.get('SELECT avatar FROM users WHERE id = ?', [id])
		const oldAvatar = row?.avatar || ''

		if (oldAvatar && oldAvatar !== 'default.png') {
			try {
				await fsUnlink(path.join(UPLOADS_DIR, oldAvatar))
			} catch (e) { }
		}

		await db.run('UPDATE users SET avatar = ? WHERE id = ?', [newName, id])
		await db.close()

		return reply.code(200).send({ 
			success: true, 
			message: 'Avatar uploaded and sanitized', 
			avatar: newName 
		})

	} catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ 
			success: false, 
			message: 'Invalid image content or processing error' 
		})
	}
})

fastify.delete('/avatar', { preHandler: [fastify.authenticate] }, async (request, reply) => {
	let db
	try {
		const { id } = request.user
		db = await openDB()
		const row = await db.get('SELECT avatar FROM users WHERE id = ?', [id])
		const oldAvatar = row?.avatar || ''
		if (oldAvatar && oldAvatar !== 'default.png') {
			try { await fsUnlink(path.join(UPLOADS_DIR, oldAvatar)) } catch (e) { /* ignore */ }
		}
		await db.run('UPDATE users SET avatar = ? WHERE id = ?', ['', id])
		await db.close()
		return reply.code(200).send({ success: true, message: 'Avatar deleted' })
	}
	catch (err) {
		if (db) await db.close()
			request.log.error(err)
		return reply.code(200).send({ success: false, message: 'Delete avatar error' })
	}
})

fastify.get('/auth/google', async (req, reply) => {
	// Dynamic Redirect URI: Use request host if configured URI is localhost/missing
	let redirectUri = GOOGLE_REDIRECT_URI;
	if (!process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI.includes('localhost')) {
		const host = req.headers['x-forwarded-host'] || req.headers.host;
		if (host) {
			redirectUri = `https://${host}/db/auth/google/callback`;
		}
	}

	const url =
		"https://accounts.google.com/o/oauth2/v2/auth?" +
	new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "email profile",
		access_type: "offline",
		prompt: "consent"
	})

	reply.redirect(url)
})

fastify.get('/auth/google/callback', async (req, reply) => {
	let db
	try {
		req.log.error('[CALLBACK START]')
		const code = req.query.code
		req.log.info('=== Google Callback Started ===')

		if (!code) {
			req.log.error('No code from Google')
			return reply.redirect('/login')
		}

		// Dynamic Redirect URI: Must match the one sent in the first step
		let redirectUri = GOOGLE_REDIRECT_URI;
		if (!process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI.includes('localhost')) {
			const host = req.headers['x-forwarded-host'] || req.headers.host;
			if (host) {
				redirectUri = `https://${host}/db/auth/google/callback`;
			}
		}

		req.log.info('Getting token from Google...')
		const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: GOOGLE_CLIENT_ID,
				client_secret: GOOGLE_CLIENT_SECRET,
				code,
				redirect_uri: redirectUri,
				grant_type: "authorization_code",
			}),
		})

		const tokenData = await tokenResponse.json()
		req.log.info('Token response:', JSON.stringify(tokenData))

		if (!tokenData.access_token) {
			req.log.error('Token error:', JSON.stringify(tokenData))
			return reply.code(200).send({ success: false, message: "Failed to get Google token" })
		}

		req.log.info('Getting user profile...')
		const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
			headers: { Authorization: `Bearer ${tokenData.access_token}` },
		})

		const googleUser = await profileRes.json()
		req.log.info('User profile received:', googleUser.email)

		const email = googleUser.email
		const login = googleUser.name.replace(/\s+/g, "_")

		req.log.info('[DB] About to open database...')
		db = await openDB()
		req.log.info('[DB] Database opened successfully')

		req.log.info('[DB] Checking for existing user...')
		let user = await db.get("SELECT * FROM users WHERE email = ?", [email])
		req.log.info('[DB] User query completed:', user ? 'Found' : 'Not found')

		if (!user) {
			req.log.info('[DB] Creating new user with login:', login)
			await db.run(
				`INSERT INTO users (login, email, password, onlineStatus, avatar)
				VALUES (?, ?, ?, 'online', 'default.png')`,
				[login, email, null]
			)
			req.log.info('[DB] Insert completed, fetching user...')

			user = await db.get("SELECT * FROM users WHERE email = ?", [email])
			req.log.info('[DB] User created with ID:', user?.id)
		} else {
			req.log.info('[DB] User already exists with ID:', user.id)
		}

		req.log.info('[DB] Updating user online status...')
		await db.run('UPDATE users SET onlineStatus = ? WHERE id = ?', ['online', user.id])
		req.log.info('[DB] User status updated')

		req.log.info('Creating JWT token...')
		const token = fastify.jwt.sign(
			{ id: user.id, login: user.login },
			{ expiresIn: '6h' }
		)

		reply.setCookie('token', token, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 6,
			secure: true
		})

		req.log.info('[DB] Closing database...')
		await db.close()
		req.log.info('[DB] Database closed successfully')

		req.log.info('=== Google Callback Success ===')

		let frontend = (process.env.FRONTEND_URL || 'https://localhost:8443').replace(/\/$/, '')
		// Dynamic Frontend URL: If default/localhost, use the actual request host
		if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost')) {
			const host = req.headers['x-forwarded-host'] || req.headers.host;
			if (host) {
				frontend = `https://${host}`;
			}
		}

		const redirectUrl = frontend + '/menu'
		req.log.info('Redirecting to:', redirectUrl)
		return reply.redirect(redirectUrl)

	}
	catch (err) {
		req.log.error('=== CALLBACK ERROR ===')
		req.log.error('Error type:', err.constructor.name)
		req.log.error('Error message:', err.message)
		req.log.error('Stack:', err.stack)

		if (db) {
			try {
				await db.close()
				req.log.info('Database closed in error handler')
			} catch (closeErr) {
				req.log.error('Error closing database in error handler:', closeErr.message)
			}
		}

		return reply.code(200).send({ success: false, message: "Google auth error: " + err.message })
	}
})



const start = async () => {
	try {
		// Reset online status on startup
		const db = await openDB()
		await db.run("UPDATE users SET onlineStatus = 'offline'")
		await db.close()
		fastify.log.info('Reset all users to offline status')

		await fastify.listen({
			port: 3000,
			host: '0.0.0.0'
		})
		setInterval(async () => {
			try {
				const db = await openDB()
				await db.run("UPDATE users SET onlineStatus = 'offline' WHERE onlineStatus = 'online'")
				await db.close()
				fastify.log.info('Cleaned up online status')
			}
			catch (err) {
				fastify.log.error('Error cleaning up online status:', err)
			}
		}, 10 * 60 * 1000)
		fastify.log.info('Periodic cleanup started')
	}
	catch (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

start()
