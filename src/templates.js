/**
 * templates.js - HTML Templates for NERD CMS
 *
 * Anemone-inspired theme templates for pages, posts, and layouts.
 */

/**
 * Base HTML template with full layout
 */
export function baseTemplate({ title, content, meta = {} }) {
  const description = meta.description || "Powered by NERD CMS";
  const author = meta.author || "NERD CMS";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(author)}">
  <meta name="generator" content="NERD CMS">
  <title>${escapeHtml(title)} | NERD CMS</title>
  <style>${getInlineCSS()}</style>
</head>
<body>
  <div class="page">
    <div class="container">
      <header>
        <nav>
          <a href="/" class="site-title">🧠 NERD CMS</a>
          <ul class="nav-links">
            <li><a href="/">Home</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/about">About</a></li>
          </ul>
          <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">
            <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          </button>
        </nav>
      </header>
      
      <main>
        ${content}
      </main>
      
      <footer>
        <div class="footer-content">
          <span>© ${new Date().getFullYear()} NERD CMS</span>
          <span>Powered by <a href="https://nerd-lang.org">NERD</a> & Cloudflare Workers</span>
        </div>
      </footer>
    </div>
  </div>
  
  <script>
    (function() {
      const theme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    })();
    
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    }
  </script>
</body>
</html>`;
}

/**
 * Home page template
 */
export function homeTemplate({ posts = [] }) {
  const postListHtml =
    posts.length > 0
      ? `<ul class="post-list">
        ${posts
          .map(
            (post) => `
          <li class="post-item">
            <h3 class="post-title"><a href="${post.slug}">${escapeHtml(post.title)}</a></h3>
            <div class="post-meta">${formatDate(post.date)}</div>
            ${post.excerpt ? `<p class="post-excerpt">${escapeHtml(post.excerpt)}</p>` : ""}
          </li>
        `,
          )
          .join("")}
      </ul>`
      : '<p class="text-secondary">No posts yet.</p>';

  const content = `
    <article>
      <h1>Welcome to NERD CMS</h1>
      <p>A minimalist content management system powered by the <strong>NERD programming language</strong>, running on Cloudflare Workers via WebAssembly.</p>
      
      <h2>Recent Posts</h2>
      ${postListHtml}
    </article>
  `;

  return baseTemplate({ title: "Home", content });
}

/**
 * Single post/page template
 */
export function postTemplate({ title, content, date, author, tags = [] }) {
  const tagsHtml =
    tags.length > 0
      ? `<div class="tags">${tags.map((t) => `<a href="/tags/${t}" class="tag">${escapeHtml(t)}</a>`).join("")}</div>`
      : "";

  const articleContent = `
    <article>
      <header class="article-header">
        <h1 class="article-title">${escapeHtml(title)}</h1>
        <div class="article-meta">
          ${date ? `<span>${formatDate(date)}</span>` : ""}
          ${author ? `<span>by ${escapeHtml(author)}</span>` : ""}
        </div>
        ${tagsHtml}
      </header>
      
      <div class="article-content">
        ${content}
      </div>
    </article>
  `;

  return baseTemplate({ title, content: articleContent, meta: { author } });
}

/**
 * Blog listing template
 */
export function blogTemplate({ posts = [], page = 1, totalPages = 1 }) {
  const postListHtml =
    posts.length > 0
      ? `<ul class="post-list">
        ${posts
          .map(
            (post) => `
          <li class="post-item">
            <h3 class="post-title"><a href="/blog/${post.slug}">${escapeHtml(post.title)}</a></h3>
            <div class="post-meta">${formatDate(post.date)}</div>
            ${post.excerpt ? `<p class="post-excerpt">${escapeHtml(post.excerpt)}</p>` : ""}
          </li>
        `,
          )
          .join("")}
      </ul>`
      : '<p class="text-secondary">No posts yet.</p>';

  const paginationHtml =
    totalPages > 1
      ? `<div class="pagination">
        ${page > 1 ? `<a href="/blog?page=${page - 1}" class="btn btn-outline">← Previous</a>` : ""}
        <span class="text-secondary">Page ${page} of ${totalPages}</span>
        ${page < totalPages ? `<a href="/blog?page=${page + 1}" class="btn btn-outline">Next →</a>` : ""}
      </div>`
      : "";

  const content = `
    <h1>Blog</h1>
    ${postListHtml}
    ${paginationHtml}
  `;

  return baseTemplate({ title: "Blog", content });
}

/**
 * About page template
 */
export function aboutTemplate() {
  const content = `
    <article>
      <h1>About NERD CMS</h1>
      <p>NERD CMS is a content management system built with the <strong>NERD programming language</strong> and compiled to WebAssembly for deployment on Cloudflare Workers.</p>
      
      <h2>Features</h2>
      <ul>
        <li>⚡ Lightning-fast edge computing</li>
        <li>🌙 Automatic dark/light theme</li>
        <li>📱 Fully responsive design</li>
        <li>🎨 Minimalist Anemone-inspired aesthetics</li>
        <li>🔧 Powered by NERD + WebAssembly</li>
      </ul>
      
      <h2>Technology Stack</h2>
      <ul>
        <li><a href="https://nerd-lang.org">NERD Language</a> - Machine-authored intermediate language</li>
        <li><a href="https://webassembly.org">WebAssembly</a> - Portable binary format</li>
        <li><a href="https://workers.cloudflare.com">Cloudflare Workers</a> - Edge computing platform</li>
      </ul>
      
      <p class="mt-lg">
        <a href="https://github.com/criticalinsight/nerd-cms" class="btn">View on GitHub</a>
      </p>
    </article>
  `;

  return baseTemplate({ title: "About", content });
}

/**
 * Plugins admin page template
 */
export function pluginsTemplate({ plugins = [] }) {
  const pluginListHtml = plugins.length > 0
    ? `<table>
        <thead>
          <tr>
            <th>Plugin</th>
            <th>Version</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${plugins.map(p => `
            <tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td><code>${escapeHtml(p.version)}</code></td>
              <td class="text-secondary">${escapeHtml(p.description)}</td>
              <td>${p.enabled 
                ? '<span class="tag" style="background:var(--accent);color:#fff">Active</span>' 
                : '<span class="tag">Disabled</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '<p class="text-secondary">No plugins registered.</p>';

  const content = `
    <article>
      <h1>🔌 Plugins</h1>
      <p>Manage installed plugins for NERD CMS.</p>
      
      <h2>Registered Plugins</h2>
      ${pluginListHtml}
      
      <h2 class="mt-lg">API</h2>
      <p>Get plugins list as JSON:</p>
      <pre><code>GET /api/plugins</code></pre>
      
      <h2>Available Hooks</h2>
      <ul>
        <li><code>request:start</code> — Before request processing</li>
        <li><code>request:end</code> — After response is ready</li>
        <li><code>route:match</code> — When a route is matched</li>
        <li><code>content:load</code> — When content is loaded</li>
        <li><code>content:transform</code> — Transform content before render</li>
        <li><code>template:before</code> — Before template render</li>
        <li><code>template:after</code> — After template render</li>
        <li><code>output:filter</code> — Filter final output</li>
      </ul>
    </article>
  `;

  return baseTemplate({ title: 'Plugins', content });
}

/**
 * 404 error page template
 */
export function notFoundTemplate() {
  const content = `
    <article class="text-center">
      <h1>404</h1>
      <p class="text-secondary">Page not found.</p>
      <p><a href="/" class="btn">Go Home</a></p>
    </article>
  `;

  return baseTemplate({ title: "Not Found", content });
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInlineCSS() {
  return `
:root{--bg:#fafafa;--bg-secondary:#f0f0f0;--text:#1a1a1a;--text-secondary:#555;--accent:#6366f1;--accent-hover:#4f46e5;--border:#e0e0e0;--shadow:rgba(0,0,0,.05);--font-sans:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;--font-mono:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;--line-height:1.7;--spacing-xs:.25rem;--spacing-sm:.5rem;--spacing-md:1rem;--spacing-lg:2rem;--spacing-xl:4rem;--max-width:42rem;--border-radius:.375rem;--icon-size:1.25rem;--transition:.2s ease}@media(prefers-color-scheme:dark){:root{--bg:#0f0f0f;--bg-secondary:#1a1a1a;--text:#e5e5e5;--text-secondary:#a0a0a0;--accent:#818cf8;--accent-hover:#a5b4fc;--border:#2a2a2a;--shadow:rgba(0,0,0,.3)}}[data-theme=dark]{--bg:#0f0f0f;--bg-secondary:#1a1a1a;--text:#e5e5e5;--text-secondary:#a0a0a0;--accent:#818cf8;--accent-hover:#a5b4fc;--border:#2a2a2a;--shadow:rgba(0,0,0,.3)}[data-theme=light]{--bg:#fafafa;--bg-secondary:#f0f0f0;--text:#1a1a1a;--text-secondary:#555;--accent:#6366f1;--accent-hover:#4f46e5;--border:#e0e0e0;--shadow:rgba(0,0,0,.05)}*,::after,::before{box-sizing:border-box;margin:0;padding:0}html{font-size:16px;scroll-behavior:smooth;-webkit-text-size-adjust:100%}body{font-family:var(--font-sans);font-size:1rem;line-height:var(--line-height);color:var(--text);background-color:var(--bg);transition:color var(--transition),background-color var(--transition);min-height:100vh}.container{max-width:var(--max-width);margin:0 auto;padding:var(--spacing-lg)}.page{display:flex;flex-direction:column;min-height:100vh}main{flex:1}h1,h2,h3,h4,h5,h6{font-weight:600;line-height:1.3;margin:var(--spacing-lg) 0 var(--spacing-md);color:var(--text)}h1{font-size:2rem}h2{font-size:1.5rem}h3{font-size:1.25rem}h1:first-child,h2:first-child,h3:first-child{margin-top:0}p{margin-bottom:var(--spacing-md)}a{color:var(--accent);text-decoration:none;transition:color var(--transition)}a:hover{color:var(--accent-hover);text-decoration:underline}strong,b{font-weight:600}small{font-size:.875rem;color:var(--text-secondary)}blockquote{margin:var(--spacing-md) 0;padding:var(--spacing-sm) var(--spacing-md);border-left:3px solid var(--accent);background:var(--bg-secondary);border-radius:0 var(--border-radius) var(--border-radius) 0;font-style:italic}hr{border:none;height:1px;background:var(--border);margin:var(--spacing-lg) 0}code,pre{font-family:var(--font-mono);font-size:.9em}code{background:var(--bg-secondary);padding:.15em .4em;border-radius:var(--border-radius)}pre{background:var(--bg-secondary);padding:var(--spacing-md);border-radius:var(--border-radius);overflow-x:auto;margin:var(--spacing-md) 0;border:1px solid var(--border)}pre code{background:none;padding:0}ul,ol{margin:var(--spacing-md) 0;padding-left:var(--spacing-lg)}li{margin-bottom:var(--spacing-xs)}li::marker{color:var(--accent)}header{padding:var(--spacing-md) 0;border-bottom:1px solid var(--border);margin-bottom:var(--spacing-lg)}nav{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--spacing-md)}.site-title{font-size:1.25rem;font-weight:700;color:var(--text);text-decoration:none}.site-title:hover{color:var(--accent);text-decoration:none}.nav-links{display:flex;gap:var(--spacing-md);list-style:none;margin:0;padding:0}.nav-links a{color:var(--text-secondary);transition:color var(--transition)}.nav-links a:hover,.nav-links a.active{color:var(--accent)}footer{padding:var(--spacing-lg) 0;border-top:1px solid var(--border);margin-top:var(--spacing-xl);color:var(--text-secondary);font-size:.875rem}.footer-content{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--spacing-md)}.post-list{list-style:none;padding:0;margin:0}.post-item{padding:var(--spacing-md) 0;border-bottom:1px solid var(--border)}.post-item:last-child{border-bottom:none}.post-title{font-size:1.1rem;font-weight:600;margin-bottom:var(--spacing-xs)}.post-meta{font-size:.875rem;color:var(--text-secondary)}.post-excerpt{margin-top:var(--spacing-sm);color:var(--text-secondary)}article{margin-bottom:var(--spacing-xl)}.article-header{margin-bottom:var(--spacing-lg)}.article-title{font-size:2rem;margin-bottom:var(--spacing-sm)}.article-meta{color:var(--text-secondary);font-size:.875rem;display:flex;gap:var(--spacing-md);flex-wrap:wrap}.article-content{font-size:1.05rem}.article-content img{max-width:100%;height:auto;border-radius:var(--border-radius);margin:var(--spacing-md) 0}.tags{display:flex;gap:var(--spacing-sm);flex-wrap:wrap;margin:var(--spacing-md) 0}.tag{display:inline-block;padding:var(--spacing-xs) var(--spacing-sm);background:var(--bg-secondary);color:var(--accent);border-radius:var(--border-radius);font-size:.8rem;transition:background var(--transition),color var(--transition)}.tag:hover{background:var(--accent);color:var(--bg);text-decoration:none}.btn{display:inline-flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-sm) var(--spacing-md);background:var(--accent);color:#fff;border:none;border-radius:var(--border-radius);font-size:.9rem;font-weight:500;cursor:pointer;text-decoration:none;transition:background var(--transition),transform var(--transition)}.btn:hover{background:var(--accent-hover);text-decoration:none;transform:translateY(-1px)}.btn-outline{background:transparent;border:1px solid var(--accent);color:var(--accent)}.btn-outline:hover{background:var(--accent);color:#fff}.theme-toggle{display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;background:transparent;border:1px solid var(--border);border-radius:50%;cursor:pointer;transition:border-color var(--transition),background var(--transition)}.theme-toggle:hover{border-color:var(--accent);background:var(--bg-secondary)}.theme-toggle svg{width:var(--icon-size);height:var(--icon-size);color:var(--text);fill:none;stroke:currentColor;transition:color var(--transition)}.accent{color:var(--accent)}.text-secondary{color:var(--text-secondary)}.text-center{text-align:center}.mt-0{margin-top:0}.mb-0{margin-bottom:0}.mt-lg{margin-top:var(--spacing-lg)}.mb-lg{margin-bottom:var(--spacing-lg)}@media(max-width:640px){:root{--font-size:15px}.container{padding:var(--spacing-md)}nav{flex-direction:column;align-items:flex-start}.footer-content{flex-direction:column;align-items:flex-start}}
  `.trim();
}
