# NOTES — decisions, gaps and things deliberately not built

Per `CLAUDE.md`: anything that felt missing is noted here rather than built unasked.
See `gotc-server/NOTES.md` for the backend's equivalent.

---

## Where the spec could not be followed literally

### 1. The sign-in panel's "three live counts" cannot be live

`README.md` §1 describes a hairline-topped row of live counts (styles, operations, cone
orders) on the ink panel. Every read endpoint needs a session, so before sign-in there is
nothing to count. Serving them would mean a new public endpoint, which is a spec addition.

The row keeps its layout and labels and shows the system's own em dash for each figure — the
same convention the garment library uses in its Cones column when nothing is assignable. If
these should be real, the change is one unauthenticated `GET /api/stats`.

### 2. Sign-in lands on the garment **library**, not a garment detail screen

`README.md` §1 says "land on the garment detail screen". There is no notion of a current
garment, and picking one arbitrarily breaks on an empty database. `BUILD_ORDER.md` phase 8's
acceptance says "lands on the garment screen", which the library satisfies. The success
notice — "Signed in as `<name>` · `<role>`." — appears there verbatim.

### 3. Demo affordances dropped, as instructed

The header role switcher and the sign-in page's demo-accounts block are gone rather than
hidden behind a dev flag; the signed-in user's real role is authoritative. The "any password"
copy is replaced with the real failure message, "Email or password is incorrect.", which comes
from the server.

---

## Implementation decisions worth knowing

### An abort is not an error

`api/client.ts` rethrows `AbortError` untouched. Wrapping it in an `ApiError` made TanStack
Query treat a cancelled request as a failed one, and the garment screen sat blank forever
after React's StrictMode double-mount cancelled the first render's requests. This is the kind
of bug that only shows up in the browser, not in a typecheck.

The `net::ERR_ABORTED` lines visible in dev tools on first load are StrictMode cancelling and
immediately refetching. They do not appear in a production build.

### Dates are formatted by hand, not by `Intl`

`Intl.DateTimeFormat('en-GB', { month: 'short' })` renders September as **"Sept"** in current
ICU. The spec's format is `DD MMM YYYY` — "02 Sep 2026" — so `lib/format.ts` uses an explicit
month table. Everything is formatted in UTC, matching what the server stores.

### No global store

`CLAUDE.md` forbids one in phase 1. The only state that has to survive a navigation is the
one-shot notice ("STY-4511 created with 12 operations copied from STY-4471."), which travels
in React Router's location state and is cleared from history on arrival — see `lib/notice.ts`.

### Optimistic editing and the flash

Operations-table inputs update local state on change and `PATCH` ~500ms later. Machine-type
changes and thread assignments persist immediately, since they are single choices rather than
typing. Every figure the calculation derives is a `<Num flash />`, which pulses `--flash` for
0.7s whenever its value changes; a reordered row flashes for 0.75s. Both respect
`prefers-reduced-motion`.

### Skeletons on first load only

The register's filter and search are part of the query key, so every keystroke would otherwise
flash the whole table back to skeletons. It uses `keepPreviousData` and shows skeletons only
when there is genuinely nothing yet.

### The one place a colour is not a token

A machine type's colour is **data**, not design: it is stored on the record precisely so the
frontend does not derive it. It is passed through as an inline custom property on the token
swatch, the operations row and the expanded panel's left border. Every other colour in the app
comes from `tokens.css`.

### Reordering

Drag-and-drop on the row, persisted on drop as one atomic `PATCH .../operations/order`. The
drag handle is also focusable and responds to ↑/↓ as a keyboard fallback, since drag-and-drop
alone is not operable without a mouse.

---

## Known gaps

- **A failed read leaves the previous rows on screen.** `ErrorNotice` now says so above the
  table, but there is no retry button — reloading the screen is the recovery.
- **No pagination in the UI.** `GET /orders` paginates server-side (default 50) and the client
  requests the first page only. Past a few hundred orders the register needs a control.
- **`GET /garments` is unpaginated** on the server, so the library loads every style.
- **The operations table's Thread column** is the spec's 314px and ellipsises a long summary
  such as `LOOPER 2 × 120 Surfilor · NEEDLE 2 × 160 Gramax`. The full string is on the
  expanded panel and the printed sheet.
- **No optimistic rollback UI.** A failed `PATCH` surfaces its message in the screen-level
  notice and the next refetch restores the true value; it does not highlight the offending row.

## Not built in phase 1 (per `CLAUDE.md`)

No PDF service (the browser prints), file uploads, notifications, audit log, soft-delete UI,
i18n, mobile layout, CI, Docker or deployment configuration. No `git init`.
