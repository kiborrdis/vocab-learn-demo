---
applyTo: '**'
---

Project uses yarn as a package manager with workspaces enabled. The project is structured with multiple packages, each serving a specific purpose. The main packages include:
- server: The backend server that serves an API and handles telegram bot interactions.
- client: The react frontend application.

We always use js modules for imports, and prefer to use `import` syntax over `require`.