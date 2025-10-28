# ModGen User Guide

## Introduction
ModGen is an Electron and React workspace for designing Minecraft mods with AI-assisted tooling. The desktop shell unifies code editing, texture management, Gradle build feedback, and integration with local development tools so that you can prototype content without leaving a single window.

This guide explains how to install the application, configure AI access, understand the workspace, and extend the project integrations that ship with the Phase 6 release.

## System requirements
- **Operating system:** Windows 10+, macOS 12+, or a modern Linux distribution capable of running Electron 28.
- **Node.js:** v18 or later for running scripts and the bundled tooling.
- **Disk space:** At least 2 GB free for local Gradle caches and generated assets.
- **OpenAI access:** A valid API key with image generation entitlement if you plan to use the AI texture workflow.

## Installation
1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/CyberDay1/modgen.git
   cd modgen
   npm install
   ```
2. Start the desktop shell in development mode:
   ```bash
   npm run dev
   ```
   This command runs the Electron main process and Vite renderer together. The renderer is served from <http://localhost:5173>, but you interact with it through the Electron window.
3. Build a distributable package (optional):
   ```bash
   npm run build
   ```
   The build output places Electron main and preload bundles in `dist/main` and the renderer bundle in `dist/renderer`.

## First run checklist
1. **Select a project root.** Ensure that the `MODGEN_ACTIVE_PROJECT_ROOT`, `MODGEN_PROJECT_ROOT`, or `MODGEN_PROJECT_DIR` environment variables point to the folder that contains your mod project. If none are provided, the asset pipeline defaults to `<repo>/projects/active`.
2. **Configure OpenAI access.** Open the **Settings** panel (gear icon) to enter your API key, optional custom endpoint, and a token limit. Saving the form writes the settings to local storage and exposes them to both the renderer and preload environment so that any embedded bridges can reuse the configuration.
3. **Verify Gradle connectivity.** If you want to stream Gradle output into the Build Log, ensure your preload script exposes one of the supported bridges (`window.electronAPI`, `window.modgen.build`, or IPC channels).
4. **Sync project metadata.** Launch the **Version Selector** to choose Minecraft targets and the loader (NeoForge, Fabric, or both). The component persists selections to local storage and propagates them to any host bridge that implements `modgen.project.setConfig`.

## Workspace overview
ModGen’s renderer is composed of modular panels that you can embed into your own layout. The default Phase 6 workspace includes the following building blocks:

### Monaco-powered code editor
The `Editor` component wraps `@monaco-editor/react`, providing syntax highlighting, automatic layout, and a dark theme tuned for TypeScript by default. Use it for editing generated source files or project scripts. Because the editor is controlled, you can pass `value`, `language`, `theme`, and `readOnly` props from the renderer state to integrate it with your file system or AI suggestions.

### Asset management panel
The **Assets** panel helps you move textures into your project without leaving the app.
- **Upload PNG:** Choose an existing image to save. The asset pipeline sanitises the destination path, ensures it stays within the active project, and writes both the canonical asset file and a mirrored copy under `generated_assets/` so downstream tooling can track provenance.
- **AI Texture Generator:** Enter a descriptive prompt to request a 512×512 texture from OpenAI’s Images API. The request honours any endpoint overrides configured in Settings and caches the OpenAI client so repeated generations reuse the same credentials. Generated textures automatically pick a slugified file name, but you can override it before saving.
- **Preview and history:** Every upload or generation updates the in-app preview and records the last 10 saves, including both the asset path and the generated counterpart.

### Build log streaming
The **Build Log** subscribes to multiple runtime bridges (`window.electronAPI`, `window.modgen`, or raw IPC) to ingest Gradle output. Messages are normalised, timestamped, colour-coded by severity, and buffered (up to 4,000 lines) with automatic scroll control. Use the optional `requestStart`/`requestStop` hooks to control when streaming begins.

### Version selector
Use the **Version Selector** to declare which Minecraft versions and loaders your mod targets. The selector validates entries against an allowlist, persists selections in `localStorage`, and syncs them with any host-provided project bridge. This makes it easy to provide the same configuration to Gradle tasks or external IDE tooling.

### Open in IDE shortcut
The **Open in IDE** button resolves the project directory from multiple sources (renderer bridge, environment variables, or `process.cwd()`) and attempts to open it using Electron’s shell helpers or platform-specific commands (`start`, `open`, or `xdg-open`). If no project directory is available, the UI surfaces a warning so you can update your environment variables or preload bridge.

## Configuring OpenAI integration
ModGen centralises endpoint discovery to reduce manual setup:

1. **Settings panel:** Enter your API key and custom endpoint (if you use Azure OpenAI or a proxy). Saving the form writes the configuration into `window.__MODGEN_SETTINGS`, mirrors the values to legacy keys (`OPENAI_ENDPOINT`, `OPENAI_API_KEY`), and exposes them to any scripts loaded after initialisation.
2. **Automatic fallbacks:** The `resolveEndpoint` helper inspects explicit arguments, environment variables, runtime globals, and JSON configuration blobs. It accepts `http` and `https` URLs, strips trailing slashes, and falls back to `https://api.openai.com/v1` when no overrides are present.
3. **Token limits:** Optionally set a maximum token budget. The Settings component stores the value and advertises it through the runtime settings object so that AI pipelines can respect your cost constraints.
4. **Client reuse:** The asset panel caches the OpenAI client keyed by API key and endpoint to avoid re-instantiation on every request.

## Working with assets
1. **Choose a destination:** Before saving, confirm the path in the destination input. Relative paths are automatically rooted in `<project>/assets/`, while absolute paths are validated to stay inside the project root.
2. **Upload existing art:** Use the file picker in the Assets panel. After selecting the file you can adjust the destination before pressing **Save to project**.
3. **Generate new textures:** Type a descriptive prompt (e.g., “Polished basalt bricks with faint cyan runes”). Click **Generate with OpenAI**. The generated PNG is saved alongside a copy in `generated_assets/` for auditing.
4. **Review the output:** Inspect the preview. If you are not satisfied, tweak the prompt and regenerate or upload a replacement file. Recent saves remain visible for quick navigation.

## Monitoring builds
1. Click **Build Log** in the workspace to view streaming Gradle output.
2. Ensure your preload script exposes one of the supported log bridges. When available, the component automatically subscribes and colour-codes `info`, `warn`, and `error` lines.
3. Use the `requestStart` hook on supported bridges to kick off a new build directly from the UI. The auto-scroll logic prevents the view from jumping when you scroll up to inspect earlier messages.

## Project configuration lifecycle
- **Persistence:** Version selections and settings are stored in the browser’s `localStorage`, enabling the workspace to remember your preferences between sessions.
- **Bridging to native tooling:** If the host preload script implements `modgen.project.getConfig` and `modgen.project.setConfig`, the Version Selector synchronises with those hooks. This keeps the Electron layer and any backend services in sync.
- **Backups:** The `rotateBackups` helper (used by backend services) keeps up to five recent backups and preserves the last known-good snapshot by reading an optional `last-success` marker. Old entries are deleted automatically.

## Opening the project in your IDE
1. Ensure the project directory can be resolved via the renderer bridge or environment variables.
2. Click **Open in IDE**. ModGen attempts Electron shell helpers first, then falls back to platform commands, and finally uses any custom bridge command. Errors are shown inline.

## Troubleshooting
- **“Set OPENAI_API_KEY” errors:** Verify your API key in Settings. The asset panel checks both renderer globals and environment variables; missing keys prevent image generation.
- **Assets saving outside the project:** Destination paths are sanitised and validated. If you see an error mentioning “outside of the project root,” update the `MODGEN_*` environment variables or adjust the destination path.
- **No Gradle output:** Confirm that your preload script exposes `window.electronAPI.onGradleLog` or `window.modgen.build.onLog`. Without a bridge, the build log remains idle.
- **Cannot open project directory:** Make sure the project path exists and is accessible. On Linux environments without `xdg-open`, install the required desktop utilities.

## Extending ModGen
ModGen’s renderer components are framework-agnostic React primitives. You can embed them in custom layouts, swap the editor language, or supply your own persistence bridges. For backend automation, use the TypeScript modules in `src/ai`, `src/assets`, and `src/project` to handle endpoint resolution, asset storage, and backup rotation.

## Additional resources
- `README.md` – project overview and scripts
- `src/ai/endpoint.ts` – endpoint resolution utilities
- `src/ai/recovery.ts` – response recovery helpers for AI chat flows
- `src/assets/assetStore.ts` – project-aware asset persistence helpers
- `src/renderer/components` – collection of renderer building blocks you can compose in your UI
