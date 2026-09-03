# CLAUDE.md — gotc-client

## The one rule that matters most

**All thread and cone arithmetic lives in `gotc-server/src/domain/threadCalculation.ts`.**
Nothing here divides by 100, multiplies by a consumption ratio, applies wastage, or calls
`Math.ceil` on a cone count. The client displays what `GET /garments/:id/calculation` and the
order snapshot return — including the `→ 145 cones` working under each thread row.

## Conventions

- TypeScript `strict: true`, plus `noUncheckedIndexedAccess`. No `any`.
- **Styling is CSS Modules plus the tokens in `src/styles/tokens.css`.** No inline styles, no
  CSS-in-JS, no Tailwind. Every colour, size and spacing value comes from a token — if a value
  is missing, add it there rather than hard-coding it in a module. (The one sanctioned
  exception is a machine type's own colour, which is data: it arrives on the record and is
  passed through as a custom property.)
- Do not copy the prototype's inline styles or its single-component structure. The prototype is
  a visual reference; this is routed screens composed of small components.
- Server state through TanStack Query with the keys in `src/api/queryKeys.ts`. **Any mutation
  that can change a number invalidates that garment's `garmentCalculation` query.**
- Local UI state stays in the component that owns it — expanded rows, drag source, filters,
  form drafts, notices. No global store in phase 1. A notice that must survive one navigation
  travels in router state via `lib/notice.ts`.
- Tables are real `<table>` elements with `<thead>`/`<tbody>`; keep the column order and
  density from the spec. **Above 700px a table is never card-ified** — that remains the rule
  for every width the tool is designed for. Below 700px each row stacks into a labelled card,
  because a ten-column row cannot be read on a phone at any width. The element stays a real
  `<table>`; only its `display` changes, and `DataTable` copies each `<th>` onto the cells
  below it as `data-label` so a renamed column cannot drift from its stacked label.
- Group siblings with flex/grid and `gap`, never with margins on each child.
- Permission-locked controls are **disabled, not hidden**, and carry the explanatory `title`
  from the permission matrix plus `aria-disabled`. Use `usePermission(key)`, which computes the
  sentence from the live matrix — never hard-code "Admin can edit this".
- Copy is final. Take every label, hint, empty state and error message verbatim from the
  handoff `README.md`; do not reword them. Server `error.message` goes straight into a notice.
- Numbers render in IBM Plex Mono through the `<Num>` component or the `.mono` class — never
  mixed into the UI face. Dates display `DD MMM YYYY` ("02 Sep 2026") via `lib/format.ts`.
- Ticket is **inverse weight** — a higher ticket is a finer thread.
- No console noise. Errors surface in the UI, not the console. Never use `alert`.

## The API contract

`src/api/types.ts` is a hand-written mirror of `gotc-server/src/dto/api-types.ts`. When a DTO
or zod schema changes on the server, update the mirror in the same session. DTOs only, no
logic.

Errors arrive as `ApiError` carrying `code`, `message` and `details` from the server's one
envelope. An abort is **not** an error — `api/client.ts` rethrows `AbortError` untouched so
the query layer can tell cancellation from failure.

## Layout

```
src/
├── api/           types.ts (the mirror) · client.ts · endpoints.ts · queryKeys.ts
├── auth/          SessionProvider · usePermission · RequireSession
├── components/    Shell, Sheet, and the shared primitives
├── lib/           format · notice · useDebouncedCallback · useFlashOnChange
├── screens/       one folder per route
└── styles/        tokens.css · global.css · print.css
```

## What not to build in phase 1

No PDF service (the browser prints), no file uploads, no notifications, no audit log, no
soft-delete UI, no i18n, no CI, no Docker.
Note anything that feels missing in `NOTES.md` rather than building it unasked.

**The "no mobile layout" rule was lifted.** The handoff spec called for a desktop-only tool at
a 1180px minimum; the app is now responsive down to 320px. Breakpoints are documented in
`styles/tokens.css` — 1024 laptop, 900 tablet (the sidebar becomes a drawer), 700 mobile
(tables become cards), 480 small phone. Custom properties cannot be used inside `@media`, so
the numbers are written literally in the modules and the tokens are documentation.

Deployment configuration now exists too: `vercel.json` here, `render.yaml` in the server.
