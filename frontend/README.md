# Howly Frontend

React + Vite client for Howly. The API base URL defaults to `http://localhost:3000/api` and can be overridden with `VITE_API_BASE_URL`.

```bash
npm install
npm run dev
```

App: http://localhost:5173

The production image builds the static app and proxies `/api` and `/uploads` to the API. `VITE_API_BASE_URL=/api` is the default for that image. Set an absolute URL only when the site and API have different public origins.

See the [root README](../README.md) for architecture, Docker, and full setup.
