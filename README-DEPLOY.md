# AI Physique Analyzer — Internet Deploy

This version is prepared for Render as a Node.js Web Service.

## What changed
- Server binds to `0.0.0.0` for public hosting.
- Server uses Render's `PORT` environment variable, with local fallback `3000`.
- `GEMINI_API_KEY` remains a server-side environment variable.
- Added `render.yaml` with a health check at `/api/health`.
- Added `.gitignore` so secrets and `node_modules` are not committed.

## Deploy
1. Put this folder into a GitHub repository.
2. In Render, create **New → Web Service** and connect that repository.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variable:
   - Key: `GEMINI_API_KEY`
   - Value: your Gemini API key
6. Deploy.
7. Open the generated `https://<name>.onrender.com` URL.

Do not put the Gemini API key into `index.html`, GitHub, or chat messages.
