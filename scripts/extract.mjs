#!/usr/bin/env node
/**
 * Playwright extract CLI — mirror a website into a folder in the project ROOT.
 *
 * Usage:
 *   npm run extract <url> [options]
 *   npx sitemorph <url> [options]
 *   node scripts/extract.mjs <url> [options]
 *
 * Examples:
 *   npm run extract https://orange-property-949925.framer.app
 *   npm run extract https://mysite.framer.website --max-depth 2
 *   npm run extract https://mysite.framer.website --out ./my-export
 *   npm run extract https://jiro.build/templates/local-services/pet-daycare-landing-page-pawvie --route /templates/local-services/pet-daycare-landing-page-pawvie
 *
 * Default output: ./<hostname>-export/  (in the project root)
 */
import fs from 'fs';
import path from 'path';
import { mirrorSite } from '../src/server/browser-mirror.js';

function printHelp() {
  console.log(`
sitemorph — morph any website into clean HTML + Tailwind

Usage:
  npm run extract <url> [options]
  npx sitemorph <url> [options]

Arguments:
  <url>                  Full URL to mirror (required, must start with http:// or https://)

Options:
  --out <dir>            Output folder. Default: ./<hostname>-export/ in the project root
  --max-depth <n>        How deep to follow internal links. Default: 2
  --timeout <ms>         Timeout per page (ms). Default: 30000
  --allowed <h1,h2>      Extra allowed hosts, comma separated
  --rendered           Save the JS-rendered DOM (default: on). Off: --no-rendered
  --clean              Also write <file>.clean.html (BEAUTIFY: readable, indented), <file>.min.html (MINIFY: 1 line, smallest bytes) and <file>.animated.html (clean + small animation script: video, cursor, headline). Default: on. Off: --no-clean
  --tailwind           Convert each page to clean Tailwind HTML (from computed styles, no AI agent): <file>.tailwind.html (BEAUTIFY: easy to read) + <file>.tailwind.min.html (MINIFY: 1 line, smallest bytes). Default: on. Off: --no-tailwind
  --route <path>         Only crawl pages under this route (+ sub-paths).
                         A path (/templates/...) or a full URL.
                         Default: whole host (old behaviour).
  -h, --help             Show this help

Examples:
  npm run extract https://orange-property-949925.framer.app
  npm run extract https://mysite.framer.website --max-depth 1 --out ./mysite-export
`);
}

function parseArgs(argv) {
  const opts = {
    url: null,
    out: null,
    maxDepth: 2,
    perPageTimeoutMs: 30000,
    allowedHosts: null,
    routePrefix: null,
    rendered: true,
    clean: true,
    tailwind: true,
  };
  const args = [...argv];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
    } else if (a === '--out') {
      opts.out = args[++i];
    } else if (a.startsWith('--out=')) {
      opts.out = a.slice('--out='.length);
    } else if (a === '--max-depth') {
      opts.maxDepth = Number(args[++i]);
    } else if (a.startsWith('--max-depth=')) {
      opts.maxDepth = Number(a.slice('--max-depth='.length));
    } else if (a === '--timeout') {
      opts.perPageTimeoutMs = Number(args[++i]);
    } else if (a.startsWith('--timeout=')) {
      opts.perPageTimeoutMs = Number(a.slice('--timeout='.length));
    } else if (a === '--allowed') {
      opts.allowedHosts = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a.startsWith('--allowed=')) {
      opts.allowedHosts = a.slice('--allowed='.length).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--route' || a === '--scope') {
      opts.routePrefix = args[++i];
    } else if (a.startsWith('--route=')) {
      opts.routePrefix = a.slice('--route='.length);
    } else if (a.startsWith('--scope=')) {
      opts.routePrefix = a.slice('--scope='.length);
    } else if (a === '--rendered') {
      opts.rendered = true;
    } else if (a === '--no-rendered') {
      opts.rendered = false;
    } else if (a === '--clean') {
      opts.clean = true;
    } else if (a === '--no-clean') {
      opts.clean = false;
    } else if (a === '--tailwind') {
      opts.tailwind = true;
    } else if (a === '--no-tailwind') {
      opts.tailwind = false;
    } else if (!a.startsWith('-') && !opts.url) {
      opts.url = a;
    } else {
      console.error(`Unknown argument: ${a}\n`);
      printHelp();
      process.exit(1);
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));

if (!opts.url) {
  console.error('Error: URL is required.\n');
  printHelp();
  process.exit(1);
}
if (!opts.url.startsWith('http://') && !opts.url.startsWith('https://')) {
  console.error('Error: URL must start with http:// or https://');
  process.exit(1);
}
let hostname;
try {
  hostname = new URL(opts.url).hostname;
} catch {
  console.error('Error: Invalid URL.');
  process.exit(1);
}

// Default output: ./<hostname>-export in the project ROOT (cwd where npm was run)
const outDir = path.resolve(process.cwd(), opts.out ?? `./${hostname}-export`);

console.log('▶ Playwright extract started');
console.log(`  URL      : ${opts.url}`);
console.log(`  Output   : ${outDir}`);
console.log(`  Max depth: ${opts.maxDepth}`);
console.log(`  Timeout  : ${opts.perPageTimeoutMs}ms`);
if (opts.allowedHosts) console.log(`  Allowed  : ${opts.allowedHosts.join(', ')}`);
if (opts.routePrefix) console.log(`  Route    : ${opts.routePrefix} (only pages under this route)`);
console.log(`  Rendered : ${opts.rendered ? 'on (JS DOM)' : 'off (raw body)'}`);
console.log('  Clean    : ' + (opts.clean ? 'on (also writes *.clean.html + *.min.html + *.animated.html)' : 'off (--no-clean)'));
console.log('  Tailwind : ' + (opts.tailwind ? 'on (also writes *.tailwind.html BEAUTIFY + *.tailwind.min.html MINIFY)' : 'off (--no-tailwind)'));
console.log('');

const started = Date.now();
try {
  const result = await mirrorSite(opts.url, outDir, {
    maxDepth: opts.maxDepth,
    perPageTimeoutMs: opts.perPageTimeoutMs,
    ...(opts.allowedHosts ? { allowedHosts: opts.allowedHosts } : {}),
    ...(opts.routePrefix ? { routePrefix: opts.routePrefix } : {}),
    rendered: opts.rendered,
    clean: opts.clean,
    tailwind: opts.tailwind,
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  const files = fs.readdirSync(outDir);
  console.log('');
  console.log(`✔ Done in ${secs}s`);
  console.log(`  Pages visited      : ${result.pagesVisited}`);
  console.log(`  Resources saved    : ${result.resourcesCaptured}`);
  console.log(`  HTML rewritten     : ${result.documentsRewritten}`);
  if (result.renderedDocuments) console.log(`  Rendered documents : ${result.renderedDocuments}`);
  if (result.cleanDocuments) console.log(`  Clean documents (.clean.html) : ${result.cleanDocuments}`);
  if (result.animatedDocuments) console.log(`  Animated documents (.animated.html) : ${result.animatedDocuments}`);
  if (result.minDocuments) console.log(`  Minified documents (.min.html) : ${result.minDocuments}`);
  if (result.tailwindDocuments) console.log(`  Tailwind documents (.tailwind.html) : ${result.tailwindDocuments}`);
  if (result.tailwindMinDocuments) console.log(`  Tailwind minified documents (.tailwind.min.html) : ${result.tailwindMinDocuments}`);
  console.log(`  Output folder      : ${outDir}`);
  console.log(`  Contents (${files.length}): ${files.slice(0, 10).join(', ')}${files.length > 10 ? ', ...' : ''}`);
  console.log('');
  console.log('To view the result:');
  console.log(`  npx serve "${outDir}"   # then open http://localhost:3000`);
} catch (err) {
  console.error('✘ Extract failed:', err?.message ?? err);
  process.exit(1);
}
