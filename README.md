# modgen

## Development

```bash
npm install
npm run dev
```

The development server runs the Vite renderer and Electron main process in parallel. The renderer serves from `http://localhost:5173` in development.

## Production build

```bash
npm run build
```

The build step outputs the renderer bundle to `dist/renderer` and the Electron main and preload scripts to `dist/main` using esbuild.
