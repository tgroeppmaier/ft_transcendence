/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./src/**/*.{html,ts}",
		"./*.html"
	],
	theme: {
		fontFamily: {
			sans: [
				"system-ui",
				"-apple-system",
				"BlinkMacSystemFont",
				"Segoe UI",
				"Arial",
				"sans-serif",
			],
			mono: [
				"ui-monospace",
				"SFMono-Regular",
				"Menlo",
				"Consolas",
				"monospace",
			],
		},
	},
	plugins: [],
}

