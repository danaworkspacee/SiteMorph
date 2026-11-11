# SiteMorph

Morph any website into clean, local, working HTML.

It opens the site in a real browser (Playwright Chromium), renders every page with JavaScript running, downloads all assets, rewrites every link to a local path, and then converts each page to **readable Tailwind CSS** plus beautified and minified variants. No AI agent, no API key, no account. Everything runs locally on your machine.

## What you get

For every page, `sitemorph` writes:

| File | What it is |
| --- | --- |
| `<page>.html` | The rendered page, exactly as the browser saw it (scripts and styles intact) |
| `<page>.clean.html` | Same page without scripts, RSC payloads and `data-*` attributes — **beautified** (indented, one tag per line, easy to read) |
| `<page>.min.html` | The clean page **minified** (one line, smallest bytes) |
| `<page>.animated.html` | Clean page + a small plain-JS animation script (videos autoplay muted and play in view, cursor follower, headline letter reveal) |
| `<page>.tailwind.html` | The page converted to **Tailwind CSS** — semantic tags, Tailwind utilities derived from computed styles, no framework class soup — **beautified** |
| `<page>.tailwind.min.html` | The Tailwind page **minified** |

All six files are written **by default**. Use `--no-clean` or `--no-tailwind` to skip a set.

## How the Tailwind conversion works — no AI agent needed

The conversion is **deterministic code, not an AI agent**. It runs inside the same Playwright browser session that rendered the page:

1. `tailwindConvertPage()` walks the live DOM and reads `getComputedStyle()` for every element.
2. Each computed style is mapped to a Tailwind utility with fixed rules: `flex` / `grid` / `grid-cols-3`, `gap-[24px]`, `p-[32px]`, `bg-[#ffe500]`, `text-[110px]`, `rounded-[24px]`, and so on.
3. Per-letter spans (how Framer/Jiro split headlines for animation) are joined back into whole words, so headings read as normal text.
4. Fonts are detected from the page (e.g. Fredoka and Satoshi become `font-display` / `font-body`, with Google Fonts / Fontshare links and a `tailwind.config` block added automatically).
5. Asset URLs are rewritten to the downloaded local files, exactly like the other outputs.

Because there is no LLM involved, the conversion is free, offline, and reproducible — run it twice and you get the same result. If you want AI-level restructuring on top (renaming classes, restructuring layout, adding responsive variants), do that as a separate step on the `.tailwind.html` file with an agent of your choice.

### Honest limits

- Hover/focus states, CSS keyframe animations, and responsive breakpoints cannot be read from computed styles — the output is a static desktop layout plus video autoplay.
- Framework artefacts are kept as-is (e.g. an absolutely positioned header, off-screen hover elements).
- Lazy assets are captured with two slow scroll passes, but a few lazy videos/backgrounds can still 404 in some runs.

## Quick start (npm)

```bash
git clone https://github.com/weknowyourgame/sitemorph.git
cd sitemorph
npm install
npx playwright install chromium
```

Extract a site:

```bash
npm run extract https://mysite.framer.website
# or, after npm install -g sitemorph:
npx sitemorph https://mysite.framer.website
```

Output goes to `./<hostname>-export/` in the project root. Serve it locally:

```bash
npx serve ./mysite.framer.website-export
# then open http://localhost:3000
```

## CLI usage

```bash
sitemorph <url> [options]

Options:
  --out <dir>            Folder output. Default: ./<hostname>-export/ in project root
  --max-depth <n>        How deep to follow internal links. Default: 2
                         (0 = that page only, 1 = + direct links, ...)
  --timeout <ms>         Timeout per page (ms). Default: 30000
  --allowed <h1,h2>      Extra hosts allowed, comma separated
  --rendered             Save the JS-rendered DOM (default: on). Off: --no-rendered
  --clean                Also write *.clean.html (beautified), *.min.html (minified)
                         and *.animated.html (clean + small animation script).
                         Default: on. Off: --no-clean
  --tailwind             Also convert each page to Tailwind CSS:
                         *.tailwind.html (beautified, easy to read) +
                         *.tailwind.min.html (minified, smallest bytes).
                         Default: on. Off: --no-tailwind
  --route <path>         Only crawl pages under this route (+ sub-paths).
                         A path (/templates/...) or a full URL. Assets from
                         CDNs are still captured. Default: whole host.
  -h, --help             Show help
```

## Examples

```bash
# One page only, no link following
npm run extract https://mysite.framer.website --max-depth 0

# Output to a custom folder
npm run extract https://mysite.framer.website --out ./mysite-export

# Only one section of a site (e.g. one template on a listing site)
npm run extract https://jiro.build/templates/local-services/pet-daycare-landing-page-pawvie \
  --route /templates/local-services/pet-daycare-landing-page-pawvie

# Raw render only — skip clean and Tailwind variants
npm run extract https://mysite.framer.website --no-clean --no-tailwind

# Directly with node
node scripts/extract.mjs https://mysite.framer.website --max-depth 1
```

## How it works

1. Playwright Chromium loads each page — a real browser, so client-rendered sites (Framer, Next.js) actually render.
2. Two slow scroll passes trigger lazy-loaded content (videos, background images).
3. The rendered DOM is saved for every frame (top page + iframes, e.g. template previews).
4. Every response is recorded and saved; `src`, `srcset` and `href` are rewritten to local relative paths, including URLs inside inline scripts / RSC payloads.
5. Clean, animated and Tailwind variants are generated from the rendered DOM.
6. The output folder is **wiped at the start of every run** (fresh mirror). Never run two extracts into the same folder expecting them to merge — extract extras into separate folders and merge with `cp -rn`.

## Web UI and API

The repo also ships a Next.js frontend and an Express API server around the same mirror engine:

```bash
npm run dev     # Next.js frontend on http://localhost:3000
npm run api:dev # Express API server on http://localhost:3001
```

API: `POST /api/mirror` with JSON `{ url, max_depth, route, rendered, clean, tailwind }`.

Optional, only for the API server / R2 upload: create `.env.local` (see the existing file for an example — `SECRET_TOKEN`, `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`).

## Notes

- Folders like `*-export/` are git-ignored (see `.gitignore`), so extracts never get committed.
- If a page is slow or blank, raise `--timeout` or lower `--max-depth`.

## Tech stack

- Next.js 15
- React 19
- Express.js (API server)
- Playwright (real-browser rendering)
- cheerio (HTML rewriting)
- Tailwind CSS
- TypeScript

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
