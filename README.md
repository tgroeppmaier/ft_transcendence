# ft_transcendence

## Setup development environment

Auto-compile TypeScript from `src/` to `dist/` and load it in the browser as ES modules.

1) Install Node.js (includes npm)
- macOS: `brew install node`

2) Init and install TypeScript
```
npm init -y
npm i -D typescript
```

3) Add npm scripts to package.json
```
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --preserveWatchOutput"
  }
}
```

4) Create tsconfig.json (src → dist)
```
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "strict": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

5) Reference the built file from HTML
- In `index.html`:
```
<script type="module" src="dist/script.js"></script>
```

6) Start auto compilation
```
npm run dev
```

Optional local server
- Serve over HTTP while developing (choose one):
  - VS Code Live Server
  - `python3 -m http.server 8000` → open http://localhost:8000

Notes
- ES modules in the browser require `type="module"` on the script tag.
- Keep sources in `src/` and compiled output in `dist/`. Add `dist/` and `node_modules/` to `.gitignore`.
- Don’t ignore `package.json` or `package-lock.json` (they’re needed to install and run the project).