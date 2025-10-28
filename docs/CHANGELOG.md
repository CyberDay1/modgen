# Changelog

## [Phase 6 Release] - 2025-10-28

### Added
- Settings panel that persists the OpenAI API key, endpoint overrides, and token limits while mirroring them to runtime bridges for downstream scripts. 
- Comprehensive OpenAI endpoint resolution utility that inspects runtime globals, environment variables, and embedded JSON blobs before falling back to the public API endpoint.
- AI response recovery toolkit that analyses completions for truncated content, unbalanced delimiters, and short outputs while providing retry scaffolding.
- Asset pipeline that sanitises destinations, enforces project-root boundaries, and mirrors saved PNGs into a generated-assets directory for provenance tracking.
- Renderer asset panel with local PNG uploads, OpenAI-powered texture generation, inline previews, and recent save history.
- Build log console that subscribes to multiple Electron/bridge interfaces, normalises severities, buffers up to 4,000 lines, and supports opt-in streaming control.
- Version selector interface for choosing supported Minecraft versions and loaders with persistence to both local storage and host project bridges.
- "Open in IDE" launcher that locates the active project directory from bridge metadata or environment variables and shells out via Electron helpers or platform commands.
- Backup rotation helper that keeps the five most recent archives while preserving the last known success snapshot via marker files.
- Minimal project manager helper for writing project configuration snapshots to disk.

### Changed
- Asset storage helpers now default to `projects/active` when no project root environment variables are set, ensuring consistent behaviour across environments.
- Generated assets automatically reuse cached OpenAI clients when credentials remain unchanged, reducing API client churn in long-lived sessions.

### Fixed
- Endpoint normalisation trims trailing slashes and rejects unsupported protocols, preventing malformed URLs from reaching the OpenAI SDK.
- Error reporting across asset, build log, and IDE launch flows surfaces human-readable messages derived from native errors, simplifying troubleshooting.
