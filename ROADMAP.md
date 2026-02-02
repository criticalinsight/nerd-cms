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
| KV Storage | Cloudflare KV for content persistence | ✅ Done |
| Markdown | Markdown to HTML converter | ✅ Done |
| Frontmatter | YAML-like metadata parsing | ✅ Done |
| Content API | `GET/POST/DELETE /api/posts/:slug` | ✅ Done |

**Design principle:** Content is immutable data. Edits create new versions.

---

## Phase 2: Admin Interface

*Minimal, auditable admin*

| Feature | Description | Status |
|---------|-------------|--------|
| Feature | Description | Status |
|---------|-------------|--------|
| Auth | Cloudflare Access or simple token | ✅ Done |
| Editor | Plain text editor (content is data) | ✅ Done |
| Preview | Client-side NERD preview | ✅ Done |
| Publish | Push to KV, log transaction | ✅ Done |
| Drafts | Save without publishing | ✅ Done |

**Design principle:** Admin actions are append-only operations on immutable data.

---

## Phase 3: Extensibility

*Composition without complection*
imp
| Feature | Description | Status |
|---------|-------------|--------|
| Hook System | Pure NERD functions (Composition) | ✅ Done |
| Themes | CSS-in-NERD, switchable at build time | ✅ V1 (Anemone) |
| Widgets | NERD functions that render fragments | ✅ Done |
| MCP Integration | Use NERD's MCP support for AI agents | ✅ Done |

**Design principle:** Plugins are functions, not frameworks.

---

## Phase 4: Discovery & Interop
 
*Be found and be useful*
 
| Feature | Description | Status |
|---------|-------------|--------|
| RSS/Atom | Auto-generated feeds for blog posts | ✅ Done |
| SEO | Open Graph & Twitter Cards generation | ✅ Done |
| JSON Feed | Standard JSON feed for modern readers | ✅ Done |
| Webhooks | Trigger external build/notify on publish | ✅ Done |
| Newsletter | Subscription widget & CSV export | ✅ Done |
| Search | Client-side search via JSON Feed | ✅ Done |

---

## Phase 5: Intelligence (Agent Native)
 
*Built for humans and AIs*
 
| Feature | Description | Status |
|---------|-------------|--------|
| Native MCP | CMS acts as an MCP server for agents | ✅ Done |
| RAG API | Chunked content API for LLM consumption | ✅ Done |
| Moe AI | Automated Housel-style analysis (Gemini) | ✅ Done |
| Unified Logic| Consolidated source for stability | ✅ Done |
| Custom Domain | Migration to `research.moecapital.com` | ✅ Done |
| TG Sentinel | Telegram Bot for real-time signal ingestion | ✅ Done |
| Sentiment | Visual color-coded ratings (🟢/🟡/🔴) | ✅ Done |
| Semantic Search | Vector-based search using Cloudflare Vectorize | Future |

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
| 2026-02-02 | Shared Buffer Bridge | Enables high-performance JS-to-Wasm data passing |
| 2026-02-02 | Unified Source Logic | Consolidated theme + core to fix compiler body-shifting bugs |
| 2026-02-02 | Moe AI Assistant | Integrated Gemini 2.0 Flash research |
| 2026-02-02 | Symbol Dashboard | Minimalist research entry interface |
| 2026-02-03 | Custom Domain | Migrated to `research.moecapital.com` |
| 2026-02-03 | TG Bot Sentinel | Real-time research triggering via Telegram channels |
| 2026-02-03 | Visual Sentiment | Color-coded verdicts (🟢/🟡/🔴) for rapid synthesis |

---

## Contributing

> *"If you want everything to be familiar, you will never learn anything new."*

PRs welcome for:
- NERD language features that enable simpler CMS patterns
- Content storage implementations
- Theme variations

---

*NERD CMS — No Effort Required, Done*
