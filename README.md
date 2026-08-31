# Household Board

A household dashboard: next 3 days agenda, 2-week calendar, per-person task
lists (Eric, Angela, Ezric), and a weekly dinner list — with a management
panel to add/edit/delete everything.

## Structure

- `dashboard.jsx` — the React dashboard component (Claude artifact). Currently
  persists via the artifact's built-in key-value storage.
- `worker/` — a Cloudflare Worker exposing a REST API over a D1 database
  (`household-board`) with `events`, `tasks`, and `dinners` tables, so the
  dashboard can eventually run on real shared backend storage instead of
  browser-local storage. See `worker/README.md` for deploy steps.

## Status

- [x] D1 database + tables created (`events`, `tasks`, `dinners`)
- [x] Worker API written (`worker/src/index.js`)
- [ ] Worker deployed (run `npx wrangler deploy` from `worker/`)
- [ ] Dashboard wired to call the deployed Worker instead of `window.storage`
