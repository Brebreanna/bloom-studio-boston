# Bloom Studio Boston — Live Deploy

Confirmed production domain: https://bloomstudioboston.com
Contact email: Contact@bloomstudioboston.com

This build is configured to run as ONE Render web service:
- Express serves `/api/*`
- Express serves the built Vite frontend
- Supabase remains the PostgreSQL database
- All shop products seed as active with quantity 3

## Render
Build command:
`npm run install:all && npm run build`

Start command:
`npm start`

Health check:
`/api/health`

Use `render.yaml` or create the service manually.

Never commit `.env` or Square/database/SMTP secrets.
