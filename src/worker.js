/**
 * worker.js - Minimal Cloudflare Worker Bootloader for NERD CMS
 *
 * This is the thinnest possible JavaScript layer required by Cloudflare Workers.
 * All CMS logic (routing, templates, content) is in NERD/WebAssembly.
 * Content storage uses Cloudflare KV.
 */

import wasmModule from "../cms.wasm";

let outputBuffer = [];
let currentPath = "/";
let currentMethod = "GET";

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
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...vals] = line.split(':');
    if (key && vals.length) meta[key.trim()] = vals.join(':').trim();
  });
  return { meta, body: match[2] };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    currentPath = url.pathname || "/";
    currentMethod = request.method;
    outputBuffer = [];

    // ========================================================================
    // Content API (data-first, immutable)
    // ========================================================================
    
    // GET /api/posts - List all posts
    if (currentPath === "/api/posts" && currentMethod === "GET") {
      const list = await env.CONTENT.list({ prefix: "post:" });
      const posts = await Promise.all(
        list.keys.map(async (k) => {
          const content = await env.CONTENT.get(k.name);
          const { meta } = parseFrontmatter(content || "");
          return {
            slug: k.name.replace("post:", ""),
            title: meta.title || k.name,
            date: meta.date || null,
            excerpt: meta.excerpt || null,
          };
        })
      );
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

    // ========================================================================
    // Blog pages (rendered from KV content)
    // ========================================================================

    // GET /blog - List posts
    if (currentPath === "/blog") {
      const list = await env.CONTENT.list({ prefix: "post:" });
      const posts = await Promise.all(
        list.keys.map(async (k) => {
          const content = await env.CONTENT.get(k.name);
          const { meta } = parseFrontmatter(content || "");
          return { slug: k.name.replace("post:", ""), ...meta };
        })
      );
      posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      
      // Render blog list using NERD template structure
      return renderBlogList(posts);
    }

    // GET /blog/:slug - Single post
    if (currentPath.startsWith("/blog/")) {
      const slug = currentPath.replace("/blog/", "");
      const content = await env.CONTENT.get(`post:${slug}`);
      if (!content) {
        return render404();
      }
      const { meta, body } = parseFrontmatter(content);
      return renderPost({ slug, ...meta, html: markdownToHtml(body) });
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
      
      if (currentPath === "/" || currentPath === "") {
        if (instance.exports.render_home) instance.exports.render_home();
        else if (instance.exports.main) instance.exports.main();
      } else if (currentPath === "/about") {
        if (instance.exports.render_about) instance.exports.render_about();
        else if (instance.exports.main) instance.exports.main();
      } else if (currentPath === "/plugins") {
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

// ============================================================================
// HTML Renderers (minimal, reuse NERD CSS)
// ============================================================================

const CSS = `:root{--bg:#fafafa;--bg-secondary:#f0f0f0;--text:#1a1a1a;--text-secondary:#555;--accent:#6366f1;--accent-hover:#4f46e5;--border:#e0e0e0;--font-sans:system-ui,-apple-system,sans-serif;--spacing-md:1rem;--spacing-lg:2rem;--max-width:42rem;--border-radius:.375rem;--transition:.2s ease}@media(prefers-color-scheme:dark){:root{--bg:#0f0f0f;--bg-secondary:#1a1a1a;--text:#e5e5e5;--text-secondary:#a0a0a0;--accent:#818cf8;--accent-hover:#a5b4fc;--border:#2a2a2a}}[data-theme=dark]{--bg:#0f0f0f;--bg-secondary:#1a1a1a;--text:#e5e5e5;--text-secondary:#a0a0a0;--accent:#818cf8;--accent-hover:#a5b4fc;--border:#2a2a2a}*{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--font-sans);line-height:1.7;color:var(--text);background:var(--bg);min-height:100vh}.container{max-width:var(--max-width);margin:0 auto;padding:var(--spacing-lg)}.page{display:flex;flex-direction:column;min-height:100vh}main{flex:1}h1,h2,h3{font-weight:600;margin:var(--spacing-lg) 0 var(--spacing-md)}h1{font-size:2rem}h2{font-size:1.5rem}h1:first-child{margin-top:0}p{margin-bottom:var(--spacing-md)}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}code{background:var(--bg-secondary);padding:.15em .4em;border-radius:var(--border-radius)}ul{margin:var(--spacing-md) 0;padding-left:var(--spacing-lg)}li{margin-bottom:.25rem}li::marker{color:var(--accent)}header{padding:var(--spacing-md) 0;border-bottom:1px solid var(--border);margin-bottom:var(--spacing-lg)}nav{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--spacing-md)}.site-title{font-size:1.25rem;font-weight:700;color:var(--text);text-decoration:none}.nav-links{display:flex;gap:var(--spacing-md);list-style:none}.nav-links a{color:var(--text-secondary)}footer{padding:var(--spacing-lg) 0;border-top:1px solid var(--border);margin-top:2rem;color:var(--text-secondary);font-size:.875rem}.footer-content{display:flex;justify-content:space-between;flex-wrap:wrap;gap:var(--spacing-md)}article{margin-bottom:2rem}.post-item{padding:var(--spacing-md) 0;border-bottom:1px solid var(--border)}.post-title{font-size:1.1rem;font-weight:600;margin-bottom:.25rem}.post-meta{font-size:.875rem;color:var(--text-secondary)}.btn{display:inline-flex;padding:.5rem 1rem;background:var(--accent);color:#fff;border:none;border-radius:var(--border-radius);text-decoration:none}.btn:hover{background:var(--accent-hover);text-decoration:none}`;

function baseHtml(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | NERD CMS</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
<div class="container">
<header><nav>
<a href="/" class="site-title">🧠 NERD CMS</a>
<ul class="nav-links">
<li><a href="/">Home</a></li>
<li><a href="/blog">Blog</a></li>
<li><a href="/about">About</a></li>
</ul>
</nav></header>
<main>${content}</main>
<footer><div class="footer-content">
<span>© 2026 NERD CMS</span>
<span>Powered by <a href="https://nerd-lang.org">NERD</a></span>
</div></footer>
</div></div>
<script>(function(){var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)})();</script>
</body></html>`;
}

function renderBlogList(posts) {
  const list = posts.length > 0
    ? posts.map(p => `<div class="post-item"><h3 class="post-title"><a href="/blog/${p.slug}">${p.title || p.slug}</a></h3><div class="post-meta">${p.date || ''}</div></div>`).join('')
    : '<p>No posts yet. Use the API to create one.</p>';
  return new Response(baseHtml("Blog", `<h1>Blog</h1>${list}<p style="margin-top:2rem"><a href="/api/posts" class="btn">View API</a></p>`), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Powered-By": "NERD-CMS" },
  });
}

function renderPost({ slug, title, date, author, html }) {
  return new Response(baseHtml(title || slug, `<article><h1>${title || slug}</h1><div class="post-meta">${date || ''} ${author ? `by ${author}` : ''}</div><div style="margin-top:1rem">${html}</div></article><p><a href="/blog">← Back to Blog</a></p>`), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Powered-By": "NERD-CMS" },
  });
}

function render404() {
  return new Response(baseHtml("Not Found", `<article style="text-align:center"><h1>404</h1><p>Page not found.</p><p><a href="/" class="btn">Go Home</a></p></article>`), {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Powered-By": "NERD-CMS" },
  });
}
