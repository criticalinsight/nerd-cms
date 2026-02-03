/**
 * worker.js - Minimal Cloudflare Worker Bootloader for NERD CMS
 *
 * This is the thinnest possible JavaScript layer required by Cloudflare Workers.
 * All CMS logic (routing, templates, content) is in NERD/WebAssembly.
 * Content storage uses Cloudflare KV.
 */

import wasmModule from "../cms.wasm";

// let outputBuffer = []; // Moved to local scope
let currentPath = "/";
let currentMethod = "GET";

const MOE_SYSTEM_PROMPT = `You are Moe, a world-class financial analyst and writer who emulates the narrative style of Morgan Housel. Your tone is analytical, neutral, and precise. You focus on the timeless principles of economics and business psychology. Avoid jargon and marketing filler. Write with clarity, focusing on unit economics, capital allocation, and competitive moats. Your goal is to provide a concise yet rich narrative that lets an investor understand how a business works. 

CRITICAL: DO NOT include any introductory or concluding conversational filler. DO NOT say "Okay" or "Here is". DO NOT wrap your response in markdown code blocks (backticks). Start directly with the markdown frontmatter.

SINGLE TICKER RULE: You must ONLY analyze the specific symbol provided in the prompt. NEVER mention or batch other companies into the same post. Each post must be a distinct analysis of exactly one company.

You must assign a rating based on the following:
🟢 = Buy (Strong fundamentals, attractive valuation)
🟡 = Hold (Strong fundamentals, fair valuation; or neutral outlook)
🔴 = Sell (Deteriorating fundamentals or extreme overvaluation)

You must also identify the company's current Market Capitalization in USD Billions.`;

function readCString(memory, ptr) {
  const bytes = new Uint8Array(memory.buffer);
  let end = ptr;
  while (bytes[end] !== 0 && end < bytes.length) end++;
  return new TextDecoder().decode(bytes.subarray(ptr, end));
}

function writeCString(memory, ptr, str, maxLen) {
  const bytes = new Uint8Array(memory.buffer);
  const encoded = new TextEncoder().encode(str);
  const len = Math.min(encoded.length, maxLen - 1);
  for (let i = 0; i < len; i++) bytes[ptr + i] = encoded[i];
  bytes[ptr + len] = 0;
  return len;
}

// Simple markdown to HTML converter
function markdownToHtml(md) {
  return md
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hula])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

// Parse frontmatter from content
function parseFrontmatter(content) {
  // Strip markdown code block wrappers if present
  let cleanContent = content.trim();
  if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/^```[a-z]*\n([\s\S]*?)\n```$/i, "$1").trim();
  }
  
  const match = cleanContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: cleanContent };
  
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...vals] = line.split(':');
    if (key && vals.length) {
       let val = vals.join(':').trim();
       if (val === "true") val = true;
       if (val === "false") val = false;
       if (key.trim() === 'market_cap') val = parseFloat(val);
       meta[key.trim()] = val;
    }
  });
  return { meta, body: match[2] };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    currentPath = url.pathname || "/";
    currentMethod = request.method;
    let outputBuffer = [];

    // ========================================================================
    // Content API (data-first, immutable)
    // ========================================================================
    
    // GET /api/posts - List all posts
    if (currentPath === "/api/posts" && currentMethod === "GET") {
      const list = await env.CONTENT.list({ prefix: "post:" });
      const posts = (await Promise.all(
        list.keys.map(async (k) => {
          if (k.metadata) return { slug: k.name.replace("post:", ""), ...k.metadata };
          const content = await env.CONTENT.get(k.name);
          const { meta } = parseFrontmatter(content || "");
          return {
            slug: k.name.replace("post:", ""),
            title: meta.title || k.name,
            date: meta.date || null,
            excerpt: meta.excerpt || null,
            published: true
          };
        })
      )).filter(p => p.published !== false);
      posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      return new Response(JSON.stringify(posts, null, 2), {
        headers: { "Content-Type": "application/json", "X-Powered-By": "NERD-CMS" },
      });
    }

    // GET /api/posts/:slug - Get single post
    if (currentPath.startsWith("/api/posts/") && currentMethod === "GET") {
      const slug = currentPath.replace("/api/posts/", "");
      const content = await env.CONTENT.get(`post:${slug}`);
      if (!content) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const { meta, body } = parseFrontmatter(content);
      return new Response(JSON.stringify({ slug, ...meta, body, html: markdownToHtml(body) }, null, 2), {
        headers: { "Content-Type": "application/json", "X-Powered-By": "NERD-CMS" },
      });
    }

    // POST /api/posts/:slug - Create/update post (append-only log in future)
    if (currentPath.startsWith("/api/posts/") && currentMethod === "POST") {
      const slug = currentPath.replace("/api/posts/", "");
      const body = await request.text();
      await env.CONTENT.put(`post:${slug}`, body);
      return new Response(JSON.stringify({ success: true, slug }), {
        headers: { "Content-Type": "application/json", "X-Powered-By": "NERD-CMS" },
      });
    }

    // DELETE /api/posts/:slug - Delete post
    if (currentPath.startsWith("/api/posts/") && currentMethod === "DELETE") {
      const slug = currentPath.replace("/api/posts/", "");
      await env.CONTENT.delete(`post:${slug}`);
      return new Response(JSON.stringify({ success: true, deleted: slug }), {
        headers: { "Content-Type": "application/json", "X-Powered-By": "NERD-CMS" },
      });
    }

    // GET / (Home)
    if (currentPath === "/" || currentPath === "") {
      const list = await env.CONTENT.list({ prefix: "post:", limit: 10 });
      const posts = (await Promise.all(list.keys.map(async k => {
        if (k.metadata) return { slug: k.name.replace("post:", ""), ...k.metadata };
        const c = await env.CONTENT.get(k.name);
        const { meta } = parseFrontmatter(c || "");
        return { slug: k.name.replace("post:", ""), ...meta, published: true };
      }))).filter(p => p.published !== false);

      // COMPOUND SORT: Rating (🟢 > 🟡 > 🔴) then Market Cap (Descending)
      const ratingWeight = { "🟢": 3, "🟡": 2, "🔴": 1 };
      posts.sort((a, b) => {
        const rA = ratingWeight[a.rating] || 0;
        const rB = ratingWeight[b.rating] || 0;
        if (rB !== rA) return rB - rA;
        return (parseFloat(b.market_cap) || 0) - (parseFloat(a.market_cap) || 0);
      });

      return callWasmRender(posts, "render_home", url, env);
    }

    // GET /about
    if (currentPath === "/about") {
      return callWasmRender(null, "render_about", url, env);
    }

    // ========================================================================
    // Blog pages (rendered from KV content)
    // ========================================================================

    // GET /blog - List posts
    if (currentPath === "/blog") {
      const list = await env.CONTENT.list({ prefix: "post:" });
      const posts = (await Promise.all(
        list.keys.map(async (k) => {
          if (k.metadata) return { slug: k.name.replace("post:", ""), ...k.metadata };
          const content = await env.CONTENT.get(k.name);
          const { meta } = parseFrontmatter(content || "");
          return { slug: k.name.replace("post:", ""), ...meta, published: true };
        })
      )).filter(p => p.published !== false);
      
      // COMPOUND SORT: Rating (🟢 > 🟡 > 🔴) then Market Cap (Descending)
      const ratingWeight = { "🟢": 3, "🟡": 2, "🔴": 1 };
      posts.sort((a, b) => {
        const rA = ratingWeight[a.rating] || 0;
        const rB = ratingWeight[b.rating] || 0;
        if (rB !== rA) return rB - rA;
        return (parseFloat(b.market_cap) || 0) - (parseFloat(a.market_cap) || 0);
      });

      return callWasmRender(posts, "render_blog", url, env);
    }

    // GET /blog/:slug - Single post
    if (currentPath.startsWith("/blog/")) {
      const slug = currentPath.replace("/blog/", "");
      const content = await env.CONTENT.get(`post:${slug}`);
      if (!content) {
        return callWasmRender(null, "render_404", url, env);
      }
      const { meta, body } = parseFrontmatter(content);
      const rating = meta.rating ? `<span class="post-rating" style="font-size: 1.5rem; margin-left: 10px;">${meta.rating}</span>` : "";
      
      let html = `<header class="post-header">
        <h1>${meta.title || slug.toUpperCase()}</h1>
        <div class="post-meta">
          ${meta.author || "Anonymous"} · ${meta.date || ""} ${rating}
        </div>
      </header>
      <div class="post-content">
        ${markdownToHtml(body)}
      </div>`;
      
      const postData = { slug, ...meta, html };
      
      // Pass data to Wasm and render
      return callWasmRender(postData, "render_post", url, env);
    }

    // ========================================================================
    // Admin API & Routing
    // ========================================================================

    const ADMIN_TOKEN = "nerd-token-123"; // Demo token

    function verifyAuth(req) {
      const url = new URL(req.url);
      let token = url.searchParams.get("token") || req.headers.get("X-Admin-Token") || req.headers.get("token");
      const auth = req.headers.get("Authorization");
      if (!token && auth && auth.startsWith("Bearer ")) token = auth.replace("Bearer ", "");
      return token === ADMIN_TOKEN;
    }

    // TELEGRAM WEBHOOK HANDLER
    if (currentPath.startsWith("/api/tg-webhook/") && currentMethod === "POST") {
      try {
        const body = await request.json();
        const text = body.message?.text || body.channel_post?.text;
        
        if (text) {
          // Robust extracted symbols (deduplicated)
          const tickerRegex = /[\$#]([A-Z]{1,8})|(?:\s|^)([A-Z]{2,5})(?:\s|,|\.|$)/g;
          const matches = [...text.matchAll(tickerRegex)];
          const blacklist = ["THE", "AND", "FOR", "WITH", "THAT", "THIS", "FROM", "BUT"];
          const symbols = [...new Set(matches.map(m => m[1] || m[2]))]
                           .filter(s => s && !blacklist.includes(s));

          if (symbols.length > 0) {
            // SEQUENCE PROCESSOR: Handles all symbols in one background task to ensure spacing
            ctx.waitUntil((async () => {
              for (const symbol of symbols) {
                try {
                  const slug = symbol.toLowerCase().replace(/[^a-z0-9]/g, "-");
                  
                  // Avoid wasteful regeneration if recently analyzed (simple check)
                  const exists = await env.CONTENT.get(`post:${slug}`, { cacheTtl: 60 });
                  if (exists) {
                    console.log(`Skipping ${symbol} - Already exists.`);
                    continue;
                  }

                  console.log(`Telegram Signal: Processing ${symbol} (Isolated)...`);
                  const report = await generateMoeReport(env, symbol);
                  await savePostToKv(env, slug, report);
                  
                  // MANDATORY SPACING: Prevents AI batching and rate-limiting
                  if (symbols.length > 1) {
                    await new Promise(r => setTimeout(r, 15000));
                  }
                } catch (e) {
                  console.error(`Sentinel Error for ${symbol}:`, e);
                }
              }
            })());
          }
        }
        return new Response("OK");
      } catch (e) {
        return new Response("OK"); 
      }
    }

    // POST /api/admin/save - Save post
    if (currentPath === "/api/admin/save" && currentMethod === "POST") {
      if (!verifyAuth(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      try {
        const { slug, content } = await request.json();
        if (!slug || !content) throw new Error("Missing slug or content");
        
        await savePostToKv(env, slug, content);
        ctx.waitUntil(triggerWebhooks(slug));
        return new Response(JSON.stringify({ success: true, slug }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400 });
      }
    }

    // POST /api/admin/generate - AI Analysis (Moe)
    if (currentPath === "/api/admin/generate" && currentMethod === "POST") {
      if (!verifyAuth(request)) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      try {
        const { symbol } = await request.json();
        if (!symbol) throw new Error("Missing symbol");
        
        // We trigger generation in the background to avoid timeout
        // But for better UX we might return a status
        const report = await generateMoeReport(env, symbol);
        const slug = symbol.toLowerCase();
        await savePostToKv(env, slug, report);
        
        return new Response(JSON.stringify({ success: true, symbol, slug }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // GET /admin - Admin Interface
    if (currentPath === "/admin") {
       return callWasmRender(null, "render_admin", url, env);
    }

    // ========================================================================
    // Discovery (Phase 4)
    // ========================================================================

    // GET /rss.xml
    if (currentPath === "/rss.xml") {
       const list = await env.CONTENT.list({ prefix: "post:" });
       const posts = (await Promise.all(list.keys.map(async k => {
          const c = await env.CONTENT.get(k.name);
          const { meta, body } = parseFrontmatter(c || "");
          return { slug: k.name.replace("post:", ""), body, ...meta };
       }))).filter(p => p.published !== false);
       // Format as XML items (AI-Friendly with full content)
       const items = posts.map(p => {
         const html = markdownToHtml(p.body || "");
         return `<item>` +
           `<title>${p.title}</title>` +
           `<link>${url.origin}/blog/${p.slug}</link>` +
           `<guid>${url.origin}/blog/${p.slug}</guid>` +
           `<description>${p.excerpt||''}</description>` +
           `<content:encoded><![CDATA[${html}]]></content:encoded>` +
           `<pubDate>${new Date(p.date || Date.now()).toUTCString()}</pubDate>` +
           `</item>`;
       }).join("");
       
       const res = await callWasmRender(items, "render_rss", url, env);
       return new Response(await res.text(), { 
         headers: { "Content-Type": "application/xml", "X-Powered-By": "NERD-CMS" } 
       });
    }

    // GET /feed.json
    if (currentPath === "/feed.json") {
       const list = await env.CONTENT.list({ prefix: "post:" });
       const posts = (await Promise.all(list.keys.map(async k => {
          const c = await env.CONTENT.get(k.name);
          const { meta } = parseFrontmatter(c || "");
          return { id: k.name, url: `${url.origin}/blog/${k.name.replace("post:","")}`, ...meta };
       }))).filter(p => p.published !== false);
       return new Response(JSON.stringify({ version: "https://jsonfeed.org/version/1.1", title: "Research", items: posts }, null, 2), {
         headers: { "Content-Type": "application/json" }
       });
    }

    // ========================================================================
    // Intelligence (Phase 5)
    // ========================================================================

    // POST /mcp - Native MCP Server
    if (currentPath === "/mcp" && currentMethod === "POST") {
      try {
        const body = await request.json();
        // Minimal implementation of tools/call
        if (body.method === "tools/call" && body.params.name === "get_recent_posts") {
           const list = await env.CONTENT.list({ limit: 5, prefix: "post:" });
           return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify(list.keys) }] } }));
        }
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "Method not found" } }));
      } catch(e) { return new Response("MCP Error", { status: 500 }); }
    }

    // GET /api/rag/:slug - RAG Text Chunks
    if (currentPath.startsWith("/api/rag/")) {
      const slug = currentPath.replace("/api/rag/", "");
      const content = await env.CONTENT.get(`post:${slug}`);
      if (!content) return new Response("Not found", { status: 404 });
      const { body } = parseFrontmatter(content);
      // Split by paragraphs for simple chunking
      const chunks = body.split("\n\n").filter(c => c.trim().length > 0);
      return new Response(JSON.stringify({ slug, chunks }), { headers: { "Content-Type": "application/json" } });
    }

    // ========================================================================
    // Newsletter (Collection)
    // ========================================================================

    // POST /api/subscribe
    if (currentPath === "/api/subscribe" && currentMethod === "POST") {
      try {
        const { email } = await request.json();
        // Simple regex for email validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
           return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
        }
        await env.CONTENT.put(`sub:${email}`, JSON.stringify({ joined: new Date().toISOString(), source: "web" }));
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      } catch(e) { return new Response("Error", { status: 500 }); }
    }

    // GET /api/subscribers (Admin Only)
    if (currentPath === "/api/subscribers") {
      if (!verifyAuth(request)) return new Response("Unauthorized", { status: 401 });
      
      const list = await env.CONTENT.list({ prefix: "sub:" });
      const subs = list.keys.map(k => k.name.replace("sub:", ""));
      return new Response(JSON.stringify({ subscribers: subs, count: subs.length }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // ========================================================================
    // Mechanics (Webhooks & AI Helpers)
    // ========================================================================
    
    async function savePostToKv(env, slug, content) {
      const { meta } = parseFrontmatter(content);
      const metadata = { 
         title: meta.title || slug.toUpperCase(), 
         date: meta.date || new Date().toISOString().split('T')[0], 
         rating: meta.rating || "🟡",
         market_cap: meta.market_cap || 0,
         market_cap_formatted: meta.market_cap_formatted || "",
         published: meta.published !== false 
      };
      await env.CONTENT.put(`post:${slug}`, content, { metadata });
    }

    async function triggerWebhooks(slug) {
       try { await fetch("https://example.com/webhook", { method: "POST", body: JSON.stringify({ event: "published", slug }) }); } catch(e) {}
    }

    async function generateMoeReport(env, symbol) {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");
      
      const prompt = `Analyze ONLY the company: ${symbol}. 
- Do NOT mention or include data for any other ticker.
- Use only verifiable, factual information for ${symbol}.
- Be concise, analytical, and concrete, with no filler or marketing language.

Output format (START IMMEDIATELY WITH THIS):
---
title: ${symbol} Analysis
date: ${new Date().toISOString().split('T')[0]}
author: Moe
rating: [Emoji: 🟢, 🟡, or 🔴]
market_cap: [Number only, USD Billions, e.g. 3100.5]
market_cap_formatted: [E.g. $3.1T or $450B]
---

Executive Summary (about 150–200 words)
Summarize in plain English how this company makes money, its economic quality, and where its edge and risks lie.
End with one sentence that describes the business to an investor in one line.

1. What They Sell and Who Buys
2. How They Make Money
3. Revenue Quality
4. Cost Structure
5. Capital Intensity
6. Growth Drivers
7. Competitive Edge
8. Industry Structure and Position
9. Unit Economics and Key KPIs
10. Capital Allocation and Balance Sheet
11. Risks and Failure Modes
12. Valuation and Expected Return Profile
13. Catalysts and Time Horizon

Tone: Analytical, neutral, precise (style of Morgan Housel).`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          system_instruction: { parts: [{ text: MOE_SYSTEM_PROMPT }] }
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error: ${err}`);
      }
      const json = await res.json();
      return json.candidates[0].content.parts[0].text;
    }

    // ========================================================================
    // NERD Wasm Pages
    // ========================================================================

    try {
      const instance = await WebAssembly.instantiate(wasmModule, {
        env: {
          js_print_string: (ptr) => {
            outputBuffer.push(readCString(instance.exports.memory, ptr));
          },
          js_print_number: (num) => {
            outputBuffer.push(Number.isInteger(num) ? String(num) : num.toPrecision(6).replace(/\.?0+$/, ''));
          },
          js_get_request_path: (ptr, maxLen) => {
            return writeCString(instance.exports.memory, ptr, currentPath, maxLen);
          },
          js_get_request_method: (ptr, maxLen) => {
            return writeCString(instance.exports.memory, ptr, currentMethod, maxLen);
          },
          puts: (ptr) => { outputBuffer.push(readCString(instance.exports.memory, ptr)); return 0; },
          printf: () => 0,
        },
      });

      if (instance.exports.wasm_reset_heap) instance.exports.wasm_reset_heap();
      
      if (currentPath === "/plugins") {
        if (instance.exports.render_plugins) instance.exports.render_plugins();
        else if (instance.exports.main) instance.exports.main();
      } else if (currentPath === "/raw") {
        if (instance.exports.render_raw) instance.exports.render_raw();
        return new Response(outputBuffer.join("\n") + "\n", {
          headers: { "Content-Type": "text/plain; charset=utf-8", "X-Powered-By": "NERD-CMS" },
        });
      } else {
        if (instance.exports.render_404) instance.exports.render_404();
        else if (instance.exports.main) instance.exports.main();
        return new Response(outputBuffer.join(""), {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8", "X-Powered-By": "NERD-CMS" },
        });
      }

      return new Response(outputBuffer.join(""), {
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Powered-By": "NERD-CMS" },
      });
    } catch (error) {
      return new Response(`NERD CMS Error: ${error.message}\n${error.stack}`, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
  },
};

// Helper to call Wasm with data
async function callWasmRender(data, exportName, url, env) {
  let localBuffer = [];
  const instance = await WebAssembly.instantiate(wasmModule, {
    env: {
      js_print_string: (ptr) => { localBuffer.push(readCString(instance.exports.memory, ptr)); },
      js_print_number: (num) => { localBuffer.push(String(num)); },
      js_get_request_path: (ptr, maxLen) => writeCString(instance.exports.memory, ptr, url.pathname, maxLen),
      js_get_request_method: (ptr, maxLen) => writeCString(instance.exports.memory, ptr, "GET", maxLen),
      puts: (ptr) => { localBuffer.push(readCString(instance.exports.memory, ptr)); return 0; },
      printf: () => 0,
    },
  });

  if (instance.exports.wasm_reset_heap) instance.exports.wasm_reset_heap();
  
  if (data && instance.exports.wasm_get_shared_buffer) {
    const bufferPtr = instance.exports.wasm_get_shared_buffer();
    let dataStr = "";
    
    if (typeof data === "string") {
      dataStr = data;
    } else if (Array.isArray(data)) {
      dataStr = data.map(p => `<li><a href="/blog/${p.slug}">${p.title || p.slug}</a> <span class="text-secondary">(${p.date || ''})</span></li>`).join("");
    } else {
      dataStr = `<h1>${data.title || data.slug}</h1>` +
                `<div class="post-meta">${data.date || ''} ${data.author ? `by ${data.author}` : ''}</div>` +
                `<div style="margin-top:1rem">${data.html}</div>`;
    }
    writeCString(instance.exports.memory, bufferPtr, dataStr, 65536);
  }

  if (instance.exports[exportName]) instance.exports[exportName]();
  else if (instance.exports.main) instance.exports.main();

  return new Response(localBuffer.join(""), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Powered-By": "NERD-CMS" },
  });
}
