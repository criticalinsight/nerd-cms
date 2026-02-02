# NERD CMS Roadmap

> *"Simplicity is a prerequisite for reliability."* — Rich Hickey

## Philosophy

This roadmap follows Rich Hickey's principles:

1. **Simple over Easy** — Choose approaches that are simple (fewer interleaved concerns), not just easy (familiar)
2. **Data over Objects** — Content is data, not behavior
3. **Immutable by Default** — Treat content as values, not places
4. **Composition over Complection** — Small, composable NERD functions

---

## Current State (v0.1)

✅ **Done:**
- NERD → LLVM → Wasm compilation
- Pure NERD templates (CSS, HTML, pages)
- Minimal JS bootloader (~80 lines)
- Cloudflare Workers deployment
- Dark/light theme
- Responsive design

---

## Phase 1: Content Layer

*Data-first content management*

| Feature | Description | Status |
|---------|-------------|--------|
| KV Storage | Cloudflare KV for content persistence | Planned |
| Markdown | NERD-native markdown parser | Planned |
| Frontmatter | YAML-like metadata in NERD syntax | Planned |
| Content API | `GET /api/posts`, `GET /api/posts/:slug` | Planned |

**Design principle:** Content is immutable data. Edits create new versions.

---

## Phase 2: Admin Interface

*Minimal, auditable admin*

| Feature | Description | Status |
|---------|-------------|--------|
| Auth | Cloudflare Access or simple token | Planned |
| Editor | Plain text editor (content is data) | Planned |
| Preview | Client-side NERD preview | Planned |
| Publish | Push to KV, log transaction | Planned |

**Design principle:** Admin actions are append-only operations on immutable data.

---

## Phase 3: Extensibility

*Composition without complection*

| Feature | Description | Status |
|---------|-------------|--------|
| Hook System | Pure NERD functions, no plugin "objects" | Planned |
| Themes | CSS-in-NERD, switchable at build time | Planned |
| Widgets | NERD functions that render fragments | Planned |
| MCP Integration | Use NERD's MCP support for AI agents | Planned |

**Design principle:** Plugins are functions, not frameworks.

---

## Phase 4: Platform

*Run anywhere*

| Feature | Description | Status |
|---------|-------------|--------|
| WASI Support | Compile to wasm32-wasi for portability | Future |
| Fastly/Spin | Deploy to alternative edge platforms | Future |
| Static Export | Pre-render to HTML at build time | Future |
| Self-Hosted | Single binary with embedded Wasm | Future |

---

## Non-Goals

Following Rich Hickey's wisdom on what **not** to do:

- ❌ **Complex state management** — No Redux, no stores
- ❌ **Plugin frameworks** — No lifecycle methods, just functions
- ❌ **ORM** — Content is JSON/KV, not objects
- ❌ **Build system complexity** — Single `build.sh`
- ❌ **JavaScript logic** — Keep JS to minimal bootloader

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-02 | Keep JS bootloader | Cloudflare requires it; WASI is experimental |
| 2026-02-02 | All templates in NERD | Simpler than JS templates, matches NERD philosophy |
| 2026-02-02 | Anemone-inspired theme | Minimalism aligns with Rich Hickey principles |

---

## Contributing

> *"If you want everything to be familiar, you will never learn anything new."*

PRs welcome for:
- NERD language features that enable simpler CMS patterns
- Content storage implementations
- Theme variations

---

*NERD CMS — No Effort Required, Done*
