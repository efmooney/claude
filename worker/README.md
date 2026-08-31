# household-board-api

A small Cloudflare Worker that exposes REST endpoints over the `household-board`
D1 database (events, tasks, dinners) so the dashboard artifact can read and
write real data instead of using in-browser storage.

## Deploy

My Cloudflare connector can create D1 databases and run SQL, but it can't
deploy Workers — that part needs the `wrangler` CLI, run once from your
machine (or from Claude Code, which can run these same commands for you).

```
cd household-board-worker
npm install
npx wrangler login       # opens a browser to authorize
npx wrangler deploy
```

`wrangler deploy` will print your Worker's URL, something like:

```
https://household-board-api.<your-subdomain>.workers.dev
```

Send me that URL and I'll wire the dashboard artifact to call it.

## Endpoints

- `GET /all` — `{ events, tasks, dinners }` in one call
- `GET /events` · `POST /events` · `PUT /events/:id` · `DELETE /events/:id`
- `GET /tasks` · `POST /tasks` · `PUT /tasks/:id` · `DELETE /tasks/:id`
- `GET /dinners` · `POST /dinners` · `PUT /dinners/:id` · `DELETE /dinners/:id`

Events: `{ date, time, person, title }` — `date` required (YYYY-MM-DD), `time` optional.
Tasks: `{ person, text, done }` — `done` is boolean.
Dinners: `{ date, meal }`.
