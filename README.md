# gotc-client

The web client for GOTC — Garment Operation & Thread Cone planning.

React 18 · Vite 6 · TypeScript (strict) · React Router 6 · TanStack Query 5 · CSS Modules.

---

## Running it

`gotc-server` must be running on port 4000 first, with a seeded database.

```bash
npm install
npm run dev        # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:4000`, so the browser sees one origin and the session
cookie stays first-party. The client never sees a token — the JWT lives in an httpOnly cookie.

Sign in with any seeded account; the password for all of them is `demo1234`:
`r.fernando@factory.lk` (Admin) · `s.jaya@factory.lk` (Fabric technician) ·
`n.perera@factory.lk` (Garment technician) · `k.aluthge@factory.lk` (Project manager).

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with the `/api` proxy |
| `npm run build` | `tsc -b` then `vite build` |
| `npm run preview` | serve the production build |
| `npm run typecheck` | types only |

---

## Routes

| Route | Screen |
|---|---|
| `/login` | Sign in |
| `/garments` | Garment library |
| `/garments/new` | New garment |
| `/garments/:id` | Garment detail — the primary working screen |
| `/garments/:id/breakdown` | Operation breakdown sheet (print) |
| `/orders` | Cone order register |
| `/orders/:id` | Cone order detail + the A4 sheet |
| `/orders/print` | Printable order register |
| `/threads` · `/machine-types` · `/fabrics` | Master data |
| `/users` | Users & permissions |

`GET /auth/me` runs on boot; a 401 redirects to `/login` and back again after signing in.

---

## Design system

`src/styles/tokens.css` holds every colour, size and spacing value from the handoff's
`DESIGN_TOKENS`. CSS Modules consume them; **no module hard-codes a value.**

- **Numbers are always IBM Plex Mono** — style numbers, tickets, metres, cone counts,
  quantities, dates, sequence numbers, ratios. Use `<Num>` or `.mono`. This is the core
  typographic rule of the system.
- Cards and tables have **square corners**. Radius is 3px on inputs/chips/tokens and 4px on
  buttons and radio cards only.
- **No shadows anywhere.** Depth comes from hairlines and ink surfaces.
- Derived figures pulse `--flash` for 0.7s whenever the calculation inputs change
  (`<Num flash />`); a reordered row flashes for 0.75s.
- Minimum width 1180px. Below that the content scrolls horizontally — there is no mobile
  layout and tables are never card-ified.

---

## State

Server state is TanStack Query, keyed as in `src/api/queryKeys.ts`:
`session` · `users` · `permissions` · `threads` · `machineTypes` · `fabrics` · `garments` ·
`garment(id)` · `garmentCalculation(id)` · `operations(garmentId)` · `orders(status, q)` ·
`order(id)`.

**Recalculation is server-authoritative.** Editing an operation, a thread, a machine ratio, a
quantity or a wastage percentage invalidates that garment's `garmentCalculation` query and the
figures come back from the API. Nothing is recomputed in the browser.

Operations-table edits are optimistic: local state updates on change, a `PATCH` follows ~500ms
later (`lib/useDebouncedCallback.ts`). Reordering persists on drop as one atomic request.

Local UI state lives in the component that owns it. The only cross-screen state is a one-shot
notice, carried in router state by `lib/notice.ts`.

### Pagination

Every list screen pages server-side: garments, cone orders, threads, machine types, fabrics
and users. One `<Pagination>` control under the table, one search box above it, page size
5 / 10 / 25 / 50 / 100 (default 25). Changing a filter or the page size returns to page one,
and `keepPreviousData` keeps the rows on screen instead of flashing skeletons.

Selects that need every row — machine types and threads on an operation, fabrics on the
new-garment screen — request `WHOLE_SET` (`limit: 200`) rather than a page.

---

## Permissions

`usePermission(key)` returns `{ can, hint, lock }`. Controls the signed-in role may not edit
are **disabled, not hidden**, and carry `title` plus `aria-disabled`. The hint sentence
("Garment technician can edit this") is computed from the live role matrix, so granting a
permission changes every hint at once — no hard-coded role names.

---

## Printing

`src/styles/print.css` sets `@page { size: A4 landscape; margin: 11mm }`, hides anything
marked `data-print="hide"` along with the shell, and lets `thead` repeat across pages. The
sheet components drop their border, fixed width and padding on paper so the page flows onto
the sheet.

Three documents print: the operation breakdown (`/garments/:id/breakdown`), the cone order
(`/orders/:id`) and the register (`/orders/print`, which prints the register's current filter).

See `NOTES.md` for decisions taken and anything deliberately left out of phase 1.
