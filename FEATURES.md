# NERD CMS Feature Guide

This guide explains the utility and best use cases for major features in NERD CMS.

## 🛠️ Core Technology

### NERD → LLVM → Wasm Compilation
**Utility**: Compiles the high-level NERD language into highly optimized WebAssembly binary code.
**Best Use Case**: Use this for high-performance server-side rendering logic where you want near-native speed and a tiny cold-start footprint (unlike heavy JS runtimes).

### Cloudflare Workers & KV Storage
**Utility**: Runs your CMS globally at the edge with zero server maintenance. KV provides low-latency, globally distributed content storage.
**Best Use Case**: High-traffic global sites (blogs, documentation) where latency matters and you don't want to manage a database or server scaling.

### Custom Domain Integration
**Utility**: Seamlessly host your CMS on a premium branded domain (e.g., `research.moecapital.com`).
**Best Use Case**: Professional researchers and analysts who want to establish authority with a dedicated URL.

---

## 📝 Content Management (Phase 1 & 2)

### Markdown & Frontmatter Support
**Utility**: Allows writing content in standard Markdown with YAML metadata (title, date).
**Best Use Case**: Developers writing technical blogs, documentation, or changelogs who prefer to write in their IDE rather than a WYSIWYG editor.

### Minimalist AI Dashboard
**Utility**: A single-input, zero-friction interface to add stock/crypto symbols for analysis.
**Best Use Case**: Rapidly growing a watchlist or research database without managing complex forms.

### Moe AI Research Assistant
**Utility**: Morgan Housel-styled financial analyst that performs a 13-point deep dive on ticker symbols.
**Best Use Case**: Investors who want factual, clear, and analytical narratives instead of hype or marketing filler.

### Content API (`/api/posts`)
**Utility**: Exposes your content as JSON, decoupled from the presentation layer.
**Best Use Case**: Using your CMS as a "Headless CMS" specifically for mobile apps or other static site generators that need to consume your content.

---

## 🧩 Extensibility (Phase 3)

### Widget System
**Utility**: Pure NERD functions that render isolated UI fragments (e.g., Newsletter, Recent Posts).
**Best Use Case**: Adding interactive or dynamic elements to your site layouts without rewriting the entire page logic. Perfect for sidebars and footers.

### Anemone Theme (CSS-in-NERD)
**Utility**: A visually consistent, dark/light mode responsive theme built entirely in NERD.
**Best Use Case**: Personal blogs, portfolios, and journals where minimalism and readability are prioritized over heavy graphics.

---

## 📡 Discovery & Interop (Phase 4)

### RSS/Atom Feeds (AI Optimized)
**Utility**: automatically generates full-text XML feeds with `content:encoded`.
**Best Use Case**: Enabling AI agents to ingest your entire site's content cleanly without HTML scraping. Perfect for training data sets or RAG pipelines.

### Open Graph & Twitter Cards (SEO)
**Utility**: Generates metadata tags that define how links look when shared on social media.
**Best Use Case**: Increasing engagement when your posts are shared on Twitter, LinkedIn, or Discord by showing a nice title, description, and image.

### Webhooks
**Utility**: Triggers external actions (like a rebuild or Slack notification) when a new post is published.
**Best Use Case**: Automating workflows, such as cross-posting to other platforms or clearing external caches upon publication.

---

## 🤖 Intelligence (Agent Native)

### Moe AI Research Assistant
**Utility**: A Morgan Housel-styled financial analyst that performs a 13-point deep dive on ticker symbols using Gemini 2.0 Flash.
**Best Use Case**: Investors who want factual, clear, and analytical narratives instead of hype or marketing filler.

### Telegram Bot Sentinel
**Utility**: Automatically monitors Telegram channels for stock/crypto symbols and triggers research.
**Best Use Case**: Community-driven research hubs or individual analysts who want to "auto-generate" deep dives simply by mentioning a ticker in a chat.

### Visual Sentiment (🟢🟡🔴)
**Utility**: Instant color-coded verdict at the top of every post.
**Best Use Case**: Fast-moving market participants who need the 'bottom line' verdict before reading the 13-point deep dive.

### Native MCP Server
**Utility**: Exposes the CMS features and content via the Model Context Protocol (MCP).
**Best Use Case**: Allowing AI agents (like Claude or IDE assistants) to directly read, write, and manage your CMS without needing custom API integrations. "Hey agent, fix the typo in my last post."

### RAG API (Chunked Content)
**Utility**: Provides content broken down into semantic chunks suitable for Vector searching.
**Best Use Case**: Building a "Chat with my Blog" feature where an AI can answer questions based _only_ on your specific written content.
