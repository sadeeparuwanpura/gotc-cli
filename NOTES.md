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

### The page must never scroll sideways

Three things had to be true together, and one of them was wrong:

1. **The 1180px minimum is the whole app, sidebar included.** `.content` was offset by the
   212px sidebar *and* given `min-width: 1180px`, so the real minimum was 1392px — a 1200px
   window was forced to scroll sideways by exactly the width of the sidebar. Because the
   sidebar and top bar are `position: fixed`, they then sat on top of the content instead of
   travelling with it, which is what made it look broken rather than merely tight. It is now
   `min-width: calc(var(--min-app-w) - var(--sidebar-w))`.
2. **A wide table scrolls inside its own box**, never by widening the page — every
   `DataTable`, the operations table and the thread-requirement table sit in a `.scrollX`
   wrapper (a global utility in `global.css`, alongside `.mono`). The table stays a real
   table; nothing is card-ified.
3. **The A4 sheet fills the desk rather than overflowing it.** A4 landscape at 96dpi is
   1123px and the desk is ~940px on a 1200px window, so the printed documents were clipped
   on the right. The sheet is now `width: min(var(--sheet-w), 100%)`. Printing is unaffected
   — the print rules drop the width entirely and `@page` supplies the real geometry.

Verified at a 1200px viewport: `document.documentElement.scrollWidth === clientWidth` on the
register, the order detail, the garment library and the master-data screens, with every action
button inside the viewport.

### Pagination

Every list screen — garments, cone orders, threads, machine types, fabrics, users — pages
server-side through one `<Pagination>` control and one `{ items, total, page, limit }`
envelope, with a server-side search box above the table. Page size defaults to 25 and the
control offers 5 / 10 / 25 / 50 / 100; changing the filter or the page size returns to page one.

The bar always renders, even when everything fits: "Showing 1–4 of 4 styles" is worth reading
on a short list, and the rows-per-page control has to stay reachable.

Screens that need a **whole** set rather than a page ask for it explicitly with
`WHOLE_SET` (`limit: 200`): the machine and thread selects on an operation, the machine
legend, the fabric picker and the copy-operations-from select on the new-garment screen. The
sidebar counts ask for `limit: 1` and read `total`, so they cost one row each.

### Approving a style

The garment sub-header carries one transition button: **Approve style** while the style is a
draft or in development, **Reopen** once it is approved. Both are gated on `approve` — the
same key the cone order uses — and both are disabled rather than hidden, with the hint from
`usePermission`. When the style is approved the meta row gains "Approved by &lt;name&gt; ·
&lt;date&gt;" after Wastage, so the record is readable without opening the information card.

The screen offers only the moves an operator actually makes. `Draft → Approved` and
`In development → Draft` are legal on the server and reachable through
`POST /garments/:id/status`, but no button asks for them; Reopen sends `In development`.
Neither mutation can change a metre or a cone, so they invalidate the garment and the library
but deliberately not `garmentCalculation`.

## Known gaps

- **A failed read leaves the previous rows on screen.** `ErrorNotice` now says so above the
  table, but there is no retry button — reloading the screen is the recovery.
- **The operations table's Thread column** is the spec's 314px and ellipsises a long summary
  such as `LOOPER 2 × 120 Surfilor · NEEDLE 2 × 160 Gramax`. The full string is on the
  expanded panel and the printed sheet.
- **No optimistic rollback UI.** A failed `PATCH` surfaces its message in the screen-level
  notice and the next refetch restores the true value; it does not highlight the offending row.

## Not built in phase 1 (per `CLAUDE.md`)

No PDF service (the browser prints), file uploads, notifications, audit log, soft-delete UI,
i18n, mobile layout, CI, Docker or deployment configuration. No `git init`.
