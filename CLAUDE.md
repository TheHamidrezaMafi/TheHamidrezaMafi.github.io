# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A dependency-free personal portfolio site (single page): `index.html` + `styles.css` + `app.js`, no framework, no build step, no npm dependencies. GitHub Pages serves the site directly from the root of `main` (`.nojekyll` is present), so committing to `main` publishes it.

## Commands

- `npm run dev` (or `npm start`) — local preview at http://localhost:4173 via `server.mjs`
- `npm run check` — syntax-check `app.js` and `server.mjs` with `node --check`

There are no tests and no linter.

**Gotcha:** `server.mjs` serves only files listed in its `publicFiles` allowlist. When adding a new asset (e.g. a project image), add its path to that set or it will 404 locally even though GitHub Pages would serve it fine.

## Architecture

Everything interactive lives in `app.js` (one ES module, loaded from `index.html`). It has three cooperating parts:

1. **`TERMINAL_LINES` + `renderTerminal()`** (top of file) — the terminal intro content as data: lines of `segment(text, tone)` objects, each optionally tagged `device: "desktop" | "mobile"` (CSS shows/hides per breakpoint). `renderTerminal()` splits every segment into per-grapheme `[data-glyph]` spans. Edit this data to change copy; the physics layer picks up changes automatically.

2. **`AsciiCampfire`** — a self-contained cellular ASCII fire animation rendered as DOM glyph cells inside the terminal. It exposes `freeze()`/`resume()` so the physics engine can snapshot a stable frame.

3. **`GlyphPhysics`** — the scroll-driven physics scene. Key ideas:
   - On activation it calls `measure()`, which turns every *visible* `[data-glyph]` span (terminal text + frozen fire cells) into a particle that remembers its "home" position. Physics is driven by the live DOM, so content changes never require physics changes.
   - A mode state machine — `intact` → `falling` → `returning` — driven by scroll progress over the hero (`handleScroll()` computes `this.progress` and also sets the `--progress` CSS custom property consumed by `styles.css`). Scrolling back up reverses the scene; the restore button / `R` key snaps glyphs home.
   - Fixed-timestep simulation on a `<canvas>` with sleeping particles, a support graph, and pointer-based drag-to-toss. The loop stops when everything sleeps or the tab is hidden.
   - The project deck (`#terminalProjects`) is moved *into* the terminal stage at `init()`; once all particles have fallen past the card area (`maybeActivateProjectDeck`), the cards become AABB colliders (`cardObstacles`) that glyphs rest on.
   - `prefers-reduced-motion` is respected: the physics path is skipped entirely and the deck reveal/hide is driven by scroll thresholds alone.

**Graceful degradation matters here:** `init().catch(...)` and the `<noscript>` block in `index.html` both un-hide the content if the intro can't run. Preserve these paths when changing init behavior.

## Where things live

- Terminal copy: `TERMINAL_LINES` near the top of `app.js`
- Project cards and contact details: `index.html`
- Colors, typography, spacing tokens: `:root` at the top of `styles.css`
- Accessibility is deliberate throughout (aria labels, skip link, `inert`/`aria-hidden` toggling on the deck via `setProjectDeckReady`) — keep it intact when editing markup.
