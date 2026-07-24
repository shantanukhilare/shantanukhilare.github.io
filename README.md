# stub

A code-share tool with no backend. Paste code, get a link — the snippet is
compressed and packed entirely into the URL fragment (the part after `#`),
so there's no database, no API, and nothing to lose if a server goes down
tomorrow. The whole thing is 3 static files.

Because the payload lives in the URL fragment, it's never sent to any
server at all (fragments aren't included in HTTP requests) — the "backend"
literally never sees it.

## Deploy on Vercel

No build step, no config. Two options:

**Vercel CLI**
```
npm i -g vercel
cd stub
vercel
```
Follow the prompts (link/create a project, accept the defaults). Vercel
auto-detects this as a static site.

**Vercel dashboard**
1. Push this folder to a GitHub repo.
2. In Vercel: **New Project → Import** the repo.
3. Framework preset: **Other**. Leave Build Command and Output Directory
   blank. Deploy.

That's it — no environment variables, no database to provision.

## How it works

- `index.html` — page markup: three sections (compose / view / error),
  toggled by JS depending on the URL.
- `styles.css` — the ticket/coat-check visual theme.
- `app.js` — all logic:
  - Compresses the pasted code with the browser's native `CompressionStream`
    (gzip), base64url-encodes it, and puts it in `location.hash`.
  - On load, reads `location.hash`, reverses the process, and renders the
    snippet.
  - Falls back to uncompressed base64 if `CompressionStream` isn't
    available (older browsers), and shows a friendly message if a link
    can't be decoded at all (rare — only if someone opens a compressed
    link in a browser old enough to lack `DecompressionStream`).
- No `innerHTML` is used anywhere — pasted code/labels are only ever set
  via `.value`/`.textContent`, so a crafted link can't inject a script into
  someone else's browser.

## Mobile copy/select, specifically

This was the actual ask, so worth calling out what's doing the work:

- The code is displayed in a `readonly <textarea>`, not a `<div>`/`<pre>`.
  Textareas support `.setSelectionRange()` reliably across mobile
  browsers, which is what powers the **Select all** button — no fiddly
  long-press-and-drag needed.
- **Copy code** and **Copy link** use the Clipboard API directly, with a
  fallback to `execCommand('copy')` for contexts where that API is
  unavailable — so tapping Copy works even without the manual select step.
- All text inputs are ≥16px font-size, which stops iOS Safari from
  auto-zooming when you tap into them.
- Long lines soft-wrap instead of requiring horizontal scrolling.
- If the Web Share API is available, a **Share** button appears next to
  the link so you can hand it off via the native share sheet.

## Known limits (inherent to "no backend")

- **Link length.** Very large snippets produce very large links. Gzip
  keeps this reasonable for typical code (a ~12,000-character file
  compresses to roughly a 1,200-character link), but there's no hard cap —
  the app shows an inline warning past ~8,000 characters, since some chat
  apps/SMS truncate very long links.
- **No editing or revocation.** Nothing is stored, so there's nothing to
  edit or delete server-side — a link is either shared or it isn't. Anyone
  with the link can view it; anyone without it can't.
- **No view counts / analytics.** There's no server to count anything.
