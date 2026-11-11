import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as cheerio from 'cheerio';

// ---- Beautify & minify for --clean output ----
// The rendered file is one giant line (26 lines, one line 240K+ characters:
// 1746 class attributes + 1364 inline style attributes). Beautify splits it
// into one tag per line with indentation; minify does the opposite: it removes
// comments and whitespace between tags so the bytes are as small as possible.
// <style>/<script>/<pre>/<textarea> blocks are protected with placeholders
// so their contents are not damaged.
const VOID_TAGS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function protectBlocks(html) {
  const blocks = [];
  const out = html.replace(/<(style|script|pre|textarea)(\s[^>]*)?>[\s\S]*?<\/\1>/gi, (m) => {
    blocks.push(m); return '\u0000' + (blocks.length - 1) + '\u0000';
  });
  return { out, blocks };
}
function restoreBlocks(html, blocks) {
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}
function beautifyHtml(html) {
  const { out, blocks } = protectBlocks(html);
  const withBreaks = out.replace(/></g, '>\n<');
  const lines = withBreaks.split('\n');
  let depth = 0; const result = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const closeMatch = line.match(/^<\/([a-zA-Z][^\s/>]*)/);
    const openMatch = line.match(/^<([a-zA-Z][^\s/>]*)/);
    const isClose = !!closeMatch;
    const isSelfClose = /\/>$/.test(line) || (openMatch && VOID_TAGS.has(openMatch[1].toLowerCase()));
    const isComment = line.startsWith('<!--');
    if (isClose) depth = Math.max(0, depth - 1);
    result.push('  '.repeat(depth) + line);
    if (!isClose && !isSelfClose && !isComment && openMatch) depth++;
    if (line.includes('</') && openMatch && !isClose && !isSelfClose) {
      // open+close tag on one line (e.g. <span>x</span>) — depth went up, bring it back down
      const tag = openMatch[1];
      if (new RegExp('</' + tag + '>$').test(line)) depth = Math.max(0, depth - 1);
    }
  }
  return restoreBlocks(result.join('\n') + '\n', blocks);
}
function minifyHtml(html) {
  const { out, blocks } = protectBlocks(html);
  let s = out.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/>\s+</g, '><');
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/^\s+|\s+$/gm, '');
  s = s.split('\n').filter((l) => l.trim() !== '').join('');
  return restoreBlocks(s, blocks);
}

// ---- Tailwind conversion: turn the rendered DOM into clean Tailwind HTML ----
// Runs INSIDE the browser (page.evaluate) once the page is fully rendered,
// so Tailwind classes are built from computed styles — not from the
// meaningless Framer/Next classes. Result: semantic tags, no class soup, no
// inline styles, no data-* attributes. Per-letter spans (Jiro/Framer headlines)
// are joined back into whole words.
// Honest limits: hover/focus states, keyframe animations, and responsive
// (breakpoint) variants cannot be read from computed styles — this file is
// a static desktop layout + video autoplay; further motion needs manual tuning.
function tailwindConvertPage() {
  var SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, NOSCRIPT: 1, TEMPLATE: 1, TITLE: 1, HEAD: 1, BASE: 1 };
  var INLINE = { SPAN: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, SMALL: 1, SUB: 1, SUP: 1 };
  var KEEP = { HEADER: 1, FOOTER: 1, NAV: 1, MAIN: 1, SECTION: 1, ARTICLE: 1, ASIDE: 1, FIGURE: 1, FIGCAPTION: 1, BLOCKQUOTE: 1, UL: 1, OL: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, P: 1, A: 1, SPAN: 1, DIV: 1, IMG: 1, VIDEO: 1, SOURCE: 1, BUTTON: 1, INPUT: 1, FORM: 1, LABEL: 1, SELECT: 1, TEXTAREA: 1, TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TD: 1, TH: 1, STRONG: 1, EM: 1, B: 1, I: 1, BR: 1, HR: 1 };
  var VOID = { IMG: 1, BR: 1, HR: 1, INPUT: 1, SOURCE: 1 };
  var fonts = { display: {}, body: {} };
  function noteFont(cs, isHeading) {
    var f = (cs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
    if (!f) return;
    var bucket = isHeading ? fonts.display : fonts.body;
    bucket[f] = (bucket[f] || 0) + 1;
  }
  function topFont(bucket) {
    var best = null, bestN = 0;
    for (var k in bucket) { if (bucket[k] > bestN) { best = k; bestN = bucket[k]; } }
    return best;
  }
  function hex(c) {
    var m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(',').map(function (s) { return parseFloat(s); });
    if (p.length === 4 && p[3] === 0) return 'transparent';
    if (p.length === 4 && p[3] < 1) return null;
    var h = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(p[i]).toString(16); h += v.length === 1 ? '0' + v : v; }
    return h;
  }
  function n(v) { var x = parseFloat(v); return isNaN(x) ? 0 : x; }
  function px(v) { var x = Math.round(n(v) * 10) / 10; return (x % 1 === 0 ? String(x | 0) : String(x)) + 'px'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function normText(s) { return String(s).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
  function joinText(el) {
    var parts = [];
    for (var i = 0; i < el.childNodes.length; i++) {
      var nd = el.childNodes[i];
      if (nd.nodeType === 3) { parts.push(nd.nodeValue); }
      else if (nd.nodeType === 1) {
        if (nd.tagName === 'BR') parts.push(' ');
        else parts.push(joinText(nd));
      }
    }
    var out = '';
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      if (!p) continue;
      if (out && !/\s$/.test(out) && !/^\s/.test(p) && p.length > 1 && !/^[.,;:!?%)\]}]/.test(p)) out += ' ';
      out += p;
    }
    return normText(out);
  }
  function classesFor(el, cs, pcs, hasText) {
    var c = [];
    var d = cs.display;
    if (d === 'flex') c.push('flex');
    else if (d === 'inline-flex') c.push('inline-flex');
    else if (d === 'grid') c.push('grid');
    else if (d === 'inline-grid') c.push('inline-grid');
    else if (d === 'none') c.push('hidden');
    else if (d === 'inline-block') c.push('inline-block');
    else if (d === 'inline') c.push('inline');
    if (d === 'flex' || d === 'inline-flex') {
      if (cs.flexDirection === 'column') c.push('flex-col');
      else if (cs.flexDirection === 'row-reverse') c.push('flex-row-reverse');
      else if (cs.flexDirection === 'column-reverse') c.push('flex-col-reverse');
      if (cs.flexWrap === 'wrap') c.push('flex-wrap');
      else if (cs.flexWrap === 'wrap-reverse') c.push('flex-wrap-reverse');
      if (cs.justifyContent === 'center') c.push('justify-center');
      else if (cs.justifyContent === 'flex-end') c.push('justify-end');
      else if (cs.justifyContent === 'space-between') c.push('justify-between');
      else if (cs.justifyContent === 'space-around') c.push('justify-around');
      else if (cs.justifyContent === 'space-evenly') c.push('justify-evenly');
      if (cs.alignItems === 'center') c.push('items-center');
      else if (cs.alignItems === 'flex-end') c.push('items-end');
      else if (cs.alignItems === 'flex-start') c.push('items-start');
      else if (cs.alignItems === 'baseline') c.push('items-baseline');
    }
    if (d === 'grid') {
      var cols = (cs.gridTemplateColumns || '').trim().split(/\s+/).filter(Boolean);
      if (cols.length > 1 && cols.every(function (x) { return x === cols[0]; })) c.push('grid-cols-' + cols.length);
      else if (cols.length > 1) c.push('grid-cols-[' + cols.join('_') + ']');
      var rows = (cs.gridTemplateRows || '').trim().split(/\s+/).filter(Boolean);
      if (rows.length > 1 && rows.every(function (x) { return x === rows[0]; })) c.push('grid-rows-' + rows.length);
    }
    var gr = n(cs.rowGap), gc = n(cs.columnGap);
    if (gr > 0 && gc > 0) {
      if (gr === gc) c.push('gap-[' + px(cs.rowGap) + ']');
      else { c.push('gap-y-[' + px(cs.rowGap) + ']'); c.push('gap-x-[' + px(cs.columnGap) + ']'); }
    } else if (gr > 0) c.push('gap-y-[' + px(cs.rowGap) + ']');
    else if (gc > 0) c.push('gap-x-[' + px(cs.columnGap) + ']');
    var pt = n(cs.paddingTop), pr = n(cs.paddingRight), pb = n(cs.paddingBottom), pl = n(cs.paddingLeft);
    if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
      if (pt === pr && pr === pb && pb === pl) c.push('p-[' + px(cs.paddingTop) + ']');
      else {
        if (pt === pb && pt > 0) c.push('py-[' + px(cs.paddingTop) + ']');
        else { if (pt > 0) c.push('pt-[' + px(cs.paddingTop) + ']'); if (pb > 0) c.push('pb-[' + px(cs.paddingBottom) + ']'); }
        if (pl === pr && pl > 0) c.push('px-[' + px(cs.paddingLeft) + ']');
        else { if (pl > 0) c.push('pl-[' + px(cs.paddingLeft) + ']'); if (pr > 0) c.push('pr-[' + px(cs.paddingRight) + ']'); }
      }
    }
    if (cs.marginLeft === 'auto' && cs.marginRight === 'auto') c.push('mx-auto');
    else {
      var mt = n(cs.marginTop), mr = n(cs.marginRight), mb = n(cs.marginBottom), ml = n(cs.marginLeft);
      if (mt > 0 || mr > 0 || mb > 0 || ml > 0) {
        if (mt === mr && mr === mb && mb === ml) c.push('m-[' + px(cs.marginTop) + ']');
        else { if (mt > 0) c.push('mt-[' + px(cs.marginTop) + ']'); if (mb > 0) c.push('mb-[' + px(cs.marginBottom) + ']'); if (ml > 0) c.push('ml-[' + px(cs.marginLeft) + ']'); if (mr > 0) c.push('mr-[' + px(cs.marginRight) + ']'); }
      }
    }
    var mw = cs.maxWidth;
    if (mw === '100%') c.push('max-w-full');
    else if (mw && mw !== 'none') c.push('max-w-[' + mw + ']');
    var mh = cs.minHeight;
    if (mh && mh !== '0px' && mh !== 'auto') c.push('min-h-[' + mh + ']');
    var bg = hex(cs.backgroundColor);
    var pbg = pcs ? hex(pcs.backgroundColor) : null;
    if (bg && bg !== 'transparent' && bg !== pbg) c.push('bg-[' + bg + ']');
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
      if (pcs && Math.abs(n(cs.width) - n(pcs.width)) < 2) c.push('w-full');
      else if (cs.width && cs.width !== 'auto') c.push('w-[' + cs.width + ']');
      if (cs.objectFit === 'cover') { c.push('object-cover'); if (cs.height && cs.height !== 'auto') c.push('h-[' + cs.height + ']'); }
      else if (cs.objectFit === 'contain') { c.push('object-contain'); if (cs.height && cs.height !== 'auto') c.push('h-[' + cs.height + ']'); }
    }
    var bw = n(cs.borderTopWidth);
    if (bw > 0) {
      c.push('border');
      var bc = hex(cs.borderTopColor);
      if (bc && bc !== 'transparent') c.push('border-[' + bc + ']');
    }
    var br = cs.borderTopLeftRadius;
    if (br && br !== '0px' && br === cs.borderTopRightRadius && br === cs.borderBottomRightRadius && br === cs.borderBottomLeftRadius) {
      if (br === '50%') c.push('rounded-full');
      else c.push('rounded-[' + br + ']');
    }
    if (cs.position === 'absolute') c.push('absolute');
    else if (cs.position === 'relative') c.push('relative');
    else if (cs.position === 'fixed') c.push('fixed');
    else if (cs.position === 'sticky') c.push('sticky');
    if (cs.position !== 'static') {
      if (cs.top !== 'auto' && cs.top !== '0px') c.push('top-[' + cs.top + ']');
      if (cs.left !== 'auto' && cs.left !== '0px') c.push('left-[' + cs.left + ']');
      if (cs.right !== 'auto' && cs.right !== '0px') c.push('right-[' + cs.right + ']');
      if (cs.bottom !== 'auto' && cs.bottom !== '0px') c.push('bottom-[' + cs.bottom + ']');
    }
    if (cs.zIndex !== 'auto') c.push('z-[' + cs.zIndex + ']');
    if (n(cs.opacity) < 1) c.push('opacity-[' + cs.opacity + ']');
    if (cs.overflow === 'hidden') c.push('overflow-hidden');
    else if (cs.overflow === 'auto') c.push('overflow-auto');
    if (cs.cursor === 'pointer') c.push('cursor-pointer');
    if (hasText) {
      var col = hex(cs.color);
      var pcol = pcs ? hex(pcs.color) : null;
      if (col && col !== pcol) c.push('text-[' + col + ']');
      var fs = cs.fontSize;
      if (pcs && fs !== pcs.fontSize) c.push('text-[' + fs + ']');
      var fw = n(cs.fontWeight);
      if (fw >= 800) c.push('font-extrabold');
      else if (fw >= 700) c.push('font-bold');
      else if (fw >= 600) c.push('font-semibold');
      else if (fw >= 500) c.push('font-medium');
      else if (fw <= 300 && fw > 0) c.push('font-light');
      var lh = cs.lineHeight;
      if (lh !== 'normal' && pcs && lh !== pcs.lineHeight) c.push('leading-[' + lh + ']');
      var ls = cs.letterSpacing;
      if (ls !== 'normal' && n(ls) !== 0) c.push('tracking-[' + ls + ']');
      if (cs.textAlign === 'center') c.push('text-center');
      else if (cs.textAlign === 'right') c.push('text-right');
      if (cs.textTransform === 'uppercase') c.push('uppercase');
      else if (cs.textTransform === 'lowercase') c.push('lowercase');
      else if (cs.textTransform === 'capitalize') c.push('capitalize');
      var ff = (cs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
      if (ff === 'Fredoka') c.push('font-display');
      else if (ff === 'Satoshi') c.push('font-body');
    }
    return c;
  }
  function attrsFor(el) {
    var out = [];
    var tag = el.tagName;
    function keep(name) { var v = el.getAttribute(name); if (v !== null && v !== '') out.push(name + '="' + esc(v) + '"'); }
    if (tag === 'A') { keep('href'); keep('target'); keep('rel'); }
    if (tag === 'IMG') { keep('src'); keep('alt'); keep('srcset'); }
    if (tag === 'VIDEO') {
      keep('src'); keep('poster');
      if (el.muted) out.push('muted');
      if (el.loop) out.push('loop');
      if (el.autoplay) out.push('autoplay');
      if (el.playsInline) out.push('playsinline');
      if (el.controls) out.push('controls');
    }
    if (tag === 'SOURCE') { keep('src'); keep('type'); }
    if (tag === 'INPUT') { keep('type'); keep('placeholder'); keep('name'); if (el.hasAttribute('required')) out.push('required'); }
    if (tag === 'TEXTAREA' || tag === 'SELECT') { keep('name'); keep('placeholder'); }
    if (tag === 'FORM') { keep('action'); keep('method'); }
    if (tag === 'BUTTON') { keep('type'); }
    if (el.hasAttribute('aria-label')) keep('aria-label');
    return out.length ? ' ' + out.join(' ') : '';
  }
  function svgOuter(el) {
    var s = el.outerHTML || '';
    s = s.replace(/\sclass="[^"]*"/g, '').replace(/\sstyle="[^"]*"/g, '').replace(/\sdata-[a-zA-Z0-9_-]+="[^"]*"/g, '');
    return s;
  }
  function convert(el, pcs) {
    var tag = el.tagName;
    if (SKIP[tag]) return '';
    if (tag === 'SVG') return svgOuter(el);
    var cs = getComputedStyle(el);
    if (cs.display === 'none') return '';
    var kids = [];
    for (var i = 0; i < el.children.length; i++) { var ch = el.children[i]; if (!SKIP[ch.tagName]) kids.push(ch); }
    var isHeading = /^H[1-6]$/.test(tag);
    if (isHeading || tag === 'P' || tag === 'A' || tag === 'SPAN' || tag === 'LI' || tag === 'BUTTON') noteFont(cs, isHeading);
    var hasMedia = false;
    var textOnly = true;
    for (var j = 0; j < kids.length; j++) {
      var k = kids[j];
      if (k.tagName === 'IMG' || k.tagName === 'VIDEO') hasMedia = true;
      if (k.tagName === 'A' || (!INLINE[k.tagName] && k.tagName !== 'BR')) textOnly = false;
    }
    var directText = false;
    for (var q = 0; q < el.childNodes.length; q++) {
      var nd0 = el.childNodes[q];
      if (nd0.nodeType === 3 && normText(nd0.nodeValue)) { directText = true; break; }
    }
    var text = '';
    if (!hasMedia && (kids.length === 0 || textOnly)) text = joinText(el);
    var inner = '';
    if (text) { inner = esc(text); }
    else {
      for (var m = 0; m < el.childNodes.length; m++) {
        var nd = el.childNodes[m];
        if (nd.nodeType === 3) { var t = normText(nd.nodeValue); if (t) inner += esc(t) + ' '; }
        else if (nd.nodeType === 1) { inner += convert(nd, cs); }
      }
      inner = normText(inner);
      if (!inner && !hasMedia) {
        var bg0 = hex(cs.backgroundColor);
        if ((!bg0 || bg0 === 'transparent') && tag !== 'IMG' && tag !== 'VIDEO' && tag !== 'INPUT') return '';
      }
    }
    var tagOut = KEEP[tag] ? tag.toLowerCase() : 'div';
    var cls = classesFor(el, cs, pcs, !!text || directText);
    var clsAttr = cls.length ? ' class="' + cls.join(' ') + '"' : '';
    if (VOID[tag]) return '<' + tagOut + clsAttr + attrsFor(el) + '>';
    return '<' + tagOut + clsAttr + attrsFor(el) + '>' + inner + '</' + tagOut + '>';
  }
  var bodyCs = getComputedStyle(document.body);
  var bodyHtml = '';
  for (var b = 0; b < document.body.children.length; b++) bodyHtml += convert(document.body.children[b], bodyCs);
  return { title: document.title || '', html: bodyHtml, fonts: { display: topFont(fonts.display), body: topFont(fonts.body) } };
}


const GOOGLE_FONTS = { 'Fredoka': 'Fredoka:wght@400;500;600;700', 'Inter': 'Inter:wght@400;500;600;700', 'Roboto': 'Roboto:wght@400;500;700', 'Poppins': 'Poppins:wght@400;500;600;700', 'Montserrat': 'Montserrat:wght@400;500;600;700', 'DM Sans': 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700', 'Sora': 'Sora:wght@400;500;600;700', 'Manrope': 'Manrope:wght@400;500;600;700;800', 'Outfit': 'Outfit:wght@400;500;600;700', 'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@400;500;600;700', 'Nunito': 'Nunito:wght@400;600;700', 'Work Sans': 'Work+Sans:wght@400;500;600;700', 'Open Sans': 'Open+Sans:wght@400;600;700', 'Lato': 'Lato:wght@400;700', 'Raleway': 'Raleway:wght@400;500;600;700', 'Playfair Display': 'Playfair+Display:wght@400;600;700', 'Merriweather': 'Merriweather:wght@400;700', 'Oswald': 'Oswald:wght@400;500;600', 'Rubik': 'Rubik:wght@400;500;600;700', 'Source Sans 3': 'Source+Sans+3:wght@400;600;700', 'IBM Plex Sans': 'IBM+Plex+Sans:wght@400;500;600;700', 'Space Grotesk': 'Space+Grotesk:wght@400;500;600;700', 'Archivo': 'Archivo:wght@400;500;600;700', 'Barlow': 'Barlow:wght@400;500;600;700', 'Figtree': 'Figtree:wght@400;500;600;700', 'Hanken Grotesk': 'Hanken+Grotesk:wght@400;500;600;700', 'Lexend': 'Lexend:wght@400;500;600;700', 'Mulish': 'Mulish:wght@400;500;600;700', 'PT Sans': 'PT+Sans:wght@400;700', 'Quicksand': 'Quicksand:wght@400;500;600;700', 'Ubuntu': 'Ubuntu:wght@400;500;700', 'Varela Round': 'Varela+Round', 'Comfortaa': 'Comfortaa:wght@400;500;600;700', 'Baloo 2': 'Baloo+2:wght@400;500;600;700', 'Libertinus Sans': 'Libertinus+Sans:wght@400;700', 'Libertinus Serif': 'Libertinus+Serif:wght@400;700', 'Instrument Sans': 'Instrument+Sans:wght@400;500;600;700', 'Bricolage Grotesque': 'Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700' };
function tailwindFontLinks(fonts) {
  const fams = [];
  for (const f of [fonts && fonts.display, fonts && fonts.body]) {
    if (f && GOOGLE_FONTS[f] && !fams.includes(GOOGLE_FONTS[f])) fams.push(GOOGLE_FONTS[f]);
  }
  const links = [];
  if (fams.length) links.push('<link href="https://fonts.googleapis.com/css2?family=' + fams.join('&family=') + '&display=swap" rel="stylesheet">');
  if ((fonts && fonts.display) === 'Satoshi' || (fonts && fonts.body) === 'Satoshi') links.push('<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet">');
  if (!links.length) return '';
  return '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' + links.join('\n');
}
const TAILWIND_ANIM_SCRIPT = `
// ---- Generic animation for --tailwind output ----
// Video: muted so autoplay is allowed, play when entering the viewport.
(function () {
  'use strict';
  var videos = document.querySelectorAll('video');
  videos.forEach(function (v) {
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) tryPlay(); else v.pause(); });
      }, { threshold: 0.2 });
      io.observe(v);
    }
    tryPlay();
  });
})();
`;
function tailwindDocument(tw) {
  const fonts = tw.fonts || {};
  const cfg = [];
  if (fonts.display) cfg.push("display: ['" + fonts.display + "', 'sans-serif']");
  if (fonts.body && fonts.body !== fonts.display) cfg.push("body: ['" + fonts.body + "', 'sans-serif']");
  const configScript = cfg.length ? '<script>\ntailwind.config = { theme: { extend: { fontFamily: { ' + cfg.join(', ') + ' } } } };\n</script>' : '';
  const escTitle = (tw.title || 'Page').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + escTitle + '</title>\n<script src="https://cdn.tailwindcss.com"></script>\n' + tailwindFontLinks(fonts) + '\n' + configScript + '\n</head>\n<body class="bg-white text-black antialiased">\n' + tw.html + '\n<script>' + TAILWIND_ANIM_SCRIPT + '</script>\n</body>\n</html>\n';
}



// Mirrors a site by actually loading it in a real browser and recording every
// response it makes, instead of statically scraping HTML (wget's approach).
// This is what lets us capture assets/components that only appear once the
// page's own JS runs (dynamic imports, lazy-loaded sections, etc.), and lets
// us properly rewrite `srcset` (wget mangles multi-candidate srcset values).
export async function mirrorSite(startUrl, outDir, { maxDepth = 2, perPageTimeoutMs = 30000, allowedHosts, signal, routePrefix, rendered = true, clean = true, tailwind = true } = {}) {
  const startUrlObj = new URL(startUrl);
  const rootHost = startUrlObj.hostname;

  // --route: limit the crawl to this path only (+ its sub-paths).
  // Can be a path (/templates/...) or a full URL (its pathname is used).
  // Default null = whole host (old behaviour). Only applies to crawled
  // pages, NOT to assets (assets may still come from allowlisted hosts,
  // e.g. CDNs).
  let scopePath = null;
  if (routePrefix) {
    try {
      scopePath = routePrefix.startsWith('http://') || routePrefix.startsWith('https://')
        ? new URL(routePrefix).pathname
        : routePrefix;
    } catch { scopePath = routePrefix; }
    if (!scopePath.startsWith('/')) scopePath = '/' + scopePath;
    if (scopePath.length > 1) scopePath = scopePath.replace(/\/+$/, '');
  }
  const isInScope = (pathname) =>
    !scopePath || pathname === scopePath || pathname.startsWith(scopePath + '/');

  // Scope to the site's own content + the asset CDNs it actually needs.
  // Deliberately excludes the Framer *editor/review* app (app.framerstatic.com,
  // api.framer.com, events.framer.com analytics, sentry.io, *.framercanvas.com)
  // which gets pulled in if a page happens to link to a real /edit route.
  // Asset hosts: also allow subdomains of rootHost (e.g. cdn.jiro.build),
  // because Jiro template assets live on a CDN subdomain, not the root host.
  // If allowedHosts is set manually, use it exactly (old behaviour).
  const hostAllowlist = allowedHosts ? new Set(allowedHosts) : null;
  const defaultExtraHosts = new Set(['framerusercontent.com', 'fonts.gstatic.com', 'fonts.googleapis.com']);
  const isAllowedHost = (hostname) => {
    if (hostAllowlist) return hostAllowlist.has(hostname);
    if (hostname === rootHost) return true;
    if (hostname.endsWith('.' + rootHost)) return true;
    return defaultExtraHosts.has(hostname);
  };

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const urlMap = new Map(); // absolute url -> { localPath, isDocument }
  const redirects = []; // [fromUrl, toUrl]
  const pendingBodies = [];
  const renderedDocs = new Map(); // absolute url -> rendered HTML (page/frame.content)
  const tailwindDocs = new Map(); // localPath -> { title, html, fonts } (--tailwind output)

  function localPathForAsset(urlStr) {
    const u = new URL(urlStr);
    let p = decodeURIComponent(u.pathname).replace(/^\//, '');
    if (p === '') p = 'index';
    const dir = path.dirname(p);
    let base = path.basename(p);
    if (u.search) {
      const hash = crypto.createHash('md5').update(u.search).digest('hex').slice(0, 8);
      const ext = path.extname(base);
      const name = ext ? base.slice(0, -ext.length) : base;
      base = `${name}.${hash}${ext}`;
    }
    const relDir = dir === '.' ? '' : dir;
    return path.join(u.hostname, relDir, base);
  }

  function localPathForDocument(urlStr) {
    const u = new URL(urlStr);
    let p = decodeURIComponent(u.pathname).replace(/^\//, '').replace(/\/$/, '');
    if (p === '') p = 'index';
    return `${p}.html`;
  }

  function relFromHtml(htmlLocalPath, targetLocalPath) {
    const fromDir = path.dirname(htmlLocalPath);
    let rel = path.relative(fromDir, targetLocalPath);
    if (!rel.startsWith('.')) rel = './' + rel;
    return rel.split(path.sep).join('/');
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  context.on('response', (response) => {
    const req = response.request();
    const resType = req.resourceType();
    const status = response.status();
    const urlStr = response.url();
    if (!urlStr.startsWith('http')) return;
    try {
      if (!isAllowedHost(new URL(urlStr).hostname)) return;
    } catch {
      return;
    }

    if (status >= 300 && status < 400) {
      const loc = response.headers()['location'];
      if (loc) {
        try {
          redirects.push([urlStr, new URL(loc, urlStr).href]);
        } catch {
          /* ignore malformed Location header */
        }
      }
      return;
    }
    if (status >= 400) return;
    if (urlMap.has(urlStr)) return;

    const isDocument = resType === 'document';
    const localPath = isDocument ? localPathForDocument(urlStr) : localPathForAsset(urlStr);
    urlMap.set(urlStr, { localPath, isDocument });

    pendingBodies.push(
      (async () => {
        try {
          const buf = await response.body();
          const fullPath = path.join(outDir, localPath);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, buf);
        } catch {
          // Response body can be unavailable for some (e.g. opaque/cached) responses; skip it.
        }
      })()
    );
  });

  try {
    const visited = new Set();
    const discoveredPageUrls = new Set([startUrl]);
    const queue = [{ url: startUrl, depth: 0 }];

    while (queue.length) {
      if (signal?.aborted) break;
      const { url, depth } = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);

      const page = await context.newPage();
      try {
        // 'networkidle' can hang forever on sites with a persistent live-collab/
        // analytics connection, so wait for 'load' and settle with a fixed delay.
        await page.goto(url, { waitUntil: 'load', timeout: perPageTimeoutMs });
      } catch {
        // Keep going even if a page is slow/unreachable — we still capture whatever loaded.
      }
      await page.waitForTimeout(2500);
      try {
        await page.evaluate(async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          let y = 0;
          const step = 400;
          const max = document.body.scrollHeight;
          while (y < max) {
            window.scrollTo(0, y);
            y += step;
            await sleep(60);
          }
          window.scrollTo(0, 0);
          await sleep(300);
        });
      } catch {
        /* page may have navigated away/closed */
      }
      await page.waitForTimeout(3500);
      // Second, slower scroll pass — lazy assets (video/bg) only start
      // loading when they enter the viewport, and need time to be captured.
      try {
        await page.evaluate(async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          let y = 0; const max = document.body.scrollHeight;
          while (y < max) { window.scrollTo(0, y); y += 600; await sleep(120); }
          window.scrollTo(0, 0); await sleep(300);
        });
      } catch { /* ignore */ }
      await page.waitForTimeout(2000);

      // --tailwind: convert the rendered DOM to Tailwind HTML (from computed styles).
      if (tailwind) {
        try {
          const tw = await page.evaluate(tailwindConvertPage);
          if (tw && tw.html && tw.html.length > 100) {
            tailwindDocs.set(localPathForDocument(page.url()), tw);
          }
        } catch { /* page failed to convert — continue without tailwind */ }
      }

      // Save the rendered DOM for all frames (top + iframe preview).
      // Preview frames do NOT go through the --route filter: they hold the template.
      if (rendered) {
        for (const frame of page.frames()) {
          try {
            const fUrl = frame.url();
            if (!fUrl.startsWith('http')) continue;
            if (!isAllowedHost(new URL(fUrl).hostname)) continue;
            const fHtml = await frame.content();
            if (fHtml && fHtml.length > 1000) renderedDocs.set(fUrl, fHtml);
          } catch { /* frame may have navigated away */ }
        }
      }

      if (depth < maxDepth) {
        let links = [];
        try {
          links = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
        } catch {
          /* ignore */
        }
        for (const link of links) {
          try {
            const lu = new URL(link);
            if (lu.hostname !== rootHost) continue;
            // Skip Framer's own real editor/review route, not part of the published site.
            if (/^\/edit(\/|$)/.test(lu.pathname)) continue;
            if (!isInScope(lu.pathname)) continue;
            lu.hash = '';
            const clean = lu.origin + lu.pathname + lu.search;
            if (!discoveredPageUrls.has(clean)) {
              discoveredPageUrls.add(clean);
              queue.push({ url: clean, depth: depth + 1 });
            }
          } catch {
            /* ignore malformed links */
          }
        }
      }

      await page.close();
    }

    await Promise.all(pendingBodies);

    // Overwrite the document file with the rendered DOM (not the raw response body).
    // The raw body of a client-rendered page (Next.js) is just a skeleton:
    // BAILOUT_TO_CLIENT_SIDE_RENDERING — it contains 0 words of the template.
    if (rendered) {
      for (const [fUrl, fHtml] of renderedDocs) {
        const info = urlMap.get(fUrl);
        if (!info || !info.isDocument) continue;
        try {
          const fullPath = path.join(outDir, info.localPath);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, fHtml);
        } catch { /* ignore */ }
      }
    }
  } finally {
    await browser.close();
  }

  // Resolve redirect aliases so references to pre-redirect URLs also map correctly.
  for (const [from, to] of redirects) {
    const target = urlMap.get(to);
    if (target && !urlMap.has(from)) urlMap.set(from, target);
  }

  let rewrittenCount = 0;
  let cleanCount = 0;
  let animatedCount = 0;
  let minCount = 0;
  let tailwindCount = 0;
  let tailwindMinCount = 0;
  const ANIM_SCRIPT = "\n// ---- Generic animation for --clean output (no Next.js/React) ----\n// Video: browsers block autoplay unless muted — set muted first,\n// then play when entering the viewport, pause when leaving.\n// Cursor cat: div.fixed.pointer-events-none holding an SVG — follow the mouse\n// with lerp, hide over buttons/links (original PawVie behaviour).\n// Headline: h1 letters (span inside span) revealed one by one.\n(function () {\n  'use strict';\n  var videos = document.querySelectorAll('video');\n  videos.forEach(function (v) {\n    v.muted = true; v.loop = true; v.playsInline = true;\n    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');\n    var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };\n    if ('IntersectionObserver' in window) {\n      var io = new IntersectionObserver(function (entries) {\n        entries.forEach(function (e) { if (e.isIntersecting) tryPlay(); else v.pause(); });\n      }, { threshold: 0.2 });\n      io.observe(v);\n    }\n    tryPlay();\n  });\n  var cat = document.querySelector('div.fixed.pointer-events-none');\n  if (cat) {\n    var tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;\n    document.addEventListener('mousemove', function (e) {\n      tx = e.clientX; ty = e.clientY;\n      var over = e.target && e.target.closest ? e.target.closest('a,button') : null;\n      var inner = cat.firstElementChild;\n      if (inner) inner.style.opacity = over ? '0' : '1';\n    });\n    var tick = function () {\n      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;\n      cat.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) translate(-50%,-75%)';\n      requestAnimationFrame(tick);\n    };\n    tick();\n  }\n  var letters = document.querySelectorAll('h1 span span');\n  if (letters.length > 10) {\n    letters.forEach(function (s, i) {\n      s.style.opacity = '0'; s.style.filter = 'blur(6px)'; s.style.transform = 'translateY(12px)';\n      s.style.transition = 'opacity .45s ease, filter .45s ease, transform .45s ease';\n      setTimeout(function () {\n        s.style.opacity = '1'; s.style.filter = 'blur(0px)'; s.style.transform = 'none';\n      }, 120 + i * 35);\n    });\n  }\n})();\n";
  for (const [urlStr, info] of urlMap) {
    if (!info.isDocument) continue;
    const fullPath = path.join(outDir, info.localPath);
    if (!fs.existsSync(fullPath)) continue;
    const html = fs.readFileSync(fullPath, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });

    const mapUrl = (raw) => {
      if (!raw) return raw;
      let abs;
      try {
        abs = new URL(raw, urlStr).href;
      } catch {
        return raw;
      }
      const target = urlMap.get(abs);
      if (!target) return raw;
      return relFromHtml(info.localPath, target.localPath);
    };

    $('[src]').each((_, el) => {
      $(el).attr('src', mapUrl($(el).attr('src')));
    });
    $('[srcset]').each((_, el) => {
      const v = $(el).attr('srcset');
      if (!v) return;
      const rewritten = v
        .split(',')
        .map((candidate) => {
          const trimmed = candidate.trim();
          const spaceIdx = trimmed.search(/\s/);
          if (spaceIdx === -1) return mapUrl(trimmed);
          return mapUrl(trimmed.slice(0, spaceIdx)) + trimmed.slice(spaceIdx);
        })
        .join(', ');
      $(el).attr('srcset', rewritten);
    });
    $('link[href]').each((_, el) => {
      const rel = $(el).attr('rel') || '';
      if (/preconnect|dns-prefetch/.test(rel)) return;
      $(el).attr('href', mapUrl($(el).attr('href')));
    });
    $('a[href]').each((_, el) => {
      $(el).attr('href', mapUrl($(el).attr('href')));
    });

    let outHtml = $.html();
    // Also rewrite URLs inside inline <script> / RSC payloads (__next_f):
    // cheerio above only rewrites src/href attributes, not text inside scripts.
    for (const [abs, target] of urlMap) {
      const rel = relFromHtml(info.localPath, target.localPath);
      if (outHtml.includes(abs)) outHtml = outHtml.split(abs).join(rel);
      try {
        const p = new URL(abs).pathname;
        if (p && p !== '/') {
          outHtml = outHtml.split('"' + p + '"').join('"' + rel + '"');
          outHtml = outHtml.split("'" + p + "'").join("'" + rel + "'");
          outHtml = outHtml.split('\\"' + p + '\\"').join('\\"' + rel + '\\"');
        }
      } catch { /* ignore */ }
    }
    fs.writeFileSync(fullPath, outHtml);
    rewrittenCount++;
    if (clean) {
      const $c = cheerio.load(outHtml, { decodeEntities: false });
      $c('script').remove();
      $c('template[data-dgst]').remove();
      $c('link[rel="preload"][as="script"]').remove();
      $c('*').each((_, el) => {
        const attribs = el.attribs || {};
        for (const name of Object.keys(attribs)) {
          if (name.startsWith('data-')) $c(el).removeAttr(name);
        }
      });
      const cleanPath = fullPath.replace(/\.html$/, '.clean.html');
      const cleanBeautified = beautifyHtml($c.html());
      fs.writeFileSync(cleanPath, cleanBeautified);
      cleanCount++;
      const minPath = fullPath.replace(/\.html$/, '.min.html');
      fs.writeFileSync(minPath, minifyHtml($c.html()));
      minCount++;
      const $a = cheerio.load(cleanBeautified, { decodeEntities: false });
      $a('body').append('<script>' + ANIM_SCRIPT + '</script>');
      const animatedPath = fullPath.replace(/\.html$/, '.animated.html');
      fs.writeFileSync(animatedPath, $a.html());
      animatedCount++;
    }
    if (tailwind) {
      const tw = tailwindDocs.get(info.localPath);
      if (tw && tw.html && tw.html.length > 100) {
        const $t = cheerio.load(tw.html, { decodeEntities: false });
        $t('[src]').each((_, el) => { $t(el).attr('src', mapUrl($t(el).attr('src'))); });
        $t('[srcset]').each((_, el) => {
          const v = $t(el).attr('srcset');
          if (!v) return;
          const rewritten = v.split(',').map((candidate) => {
            const trimmed = candidate.trim();
            const spaceIdx = trimmed.search(/\s/);
            if (spaceIdx === -1) return mapUrl(trimmed);
            return mapUrl(trimmed.slice(0, spaceIdx)) + trimmed.slice(spaceIdx);
          }).join(', ');
          $t(el).attr('srcset', rewritten);
        });
        $t('[poster]').each((_, el) => { $t(el).attr('poster', mapUrl($t(el).attr('poster'))); });
        $t('a[href]').each((_, el) => { $t(el).attr('href', mapUrl($t(el).attr('href'))); });
        const bodyTw = $t('body').html() || '';
        let docHtml = tailwindDocument({ title: tw.title, html: bodyTw, fonts: tw.fonts });
        for (const [abs, target] of urlMap) {
          const rel = relFromHtml(info.localPath, target.localPath);
          if (docHtml.includes(abs)) docHtml = docHtml.split(abs).join(rel);
        }
        const twPath = fullPath.replace(/\.html$/, '.tailwind.html');
        fs.writeFileSync(twPath, beautifyHtml(docHtml));
        tailwindCount++;
        const twMinPath = fullPath.replace(/\.html$/, '.tailwind.min.html');
        fs.writeFileSync(twMinPath, minifyHtml(docHtml));
        tailwindMinCount++;
      }
    }
  }

  return {
    pagesVisited: urlMap.size ? [...urlMap.values()].filter((v) => v.isDocument).length : 0,
    resourcesCaptured: urlMap.size,
    documentsRewritten: rewrittenCount,
    renderedDocuments: renderedDocs.size,
    cleanDocuments: cleanCount,
    animatedDocuments: animatedCount,
    minDocuments: minCount,
    tailwindDocuments: tailwindCount,
    tailwindMinDocuments: tailwindMinCount,
  };
}
