/**
 * plugins.js - NERD CMS Plugin System
 * 
 * A lightweight, hook-based plugin architecture for extending CMS functionality.
 * Plugins can hook into request lifecycle, content processing, and template rendering.
 */

// ============================================================================
// Plugin Registry
// ============================================================================

const plugins = new Map();
const hooks = new Map();

/**
 * Available hook points in the CMS lifecycle
 */
export const HOOKS = {
  // Request lifecycle
  REQUEST_START: 'request:start',       // Before any processing
  REQUEST_END: 'request:end',           // After response is ready
  ROUTE_MATCH: 'route:match',           // When a route is matched
  
  // Content processing
  CONTENT_LOAD: 'content:load',         // When content is loaded
  CONTENT_TRANSFORM: 'content:transform', // Transform content before render
  
  // Template rendering
  TEMPLATE_BEFORE: 'template:before',   // Before template render
  TEMPLATE_AFTER: 'template:after',     // After template render
  
  // Output
  OUTPUT_FILTER: 'output:filter',       // Filter final output
  
  // Custom hooks
  CUSTOM: 'custom',                     // For plugin-to-plugin communication
};

// ============================================================================
// Core Plugin API
// ============================================================================

/**
 * Register a plugin
 * @param {Object} plugin - Plugin definition
 * @param {string} plugin.name - Unique plugin name
 * @param {string} plugin.version - Semver version
 * @param {Function} plugin.init - Initialization function
 * @param {Object} plugin.hooks - Hook handlers { hookName: handler }
 */
export function registerPlugin(plugin) {
  if (!plugin.name) {
    throw new Error('Plugin must have a name');
  }
  
  if (plugins.has(plugin.name)) {
    console.warn(`Plugin "${plugin.name}" is already registered, skipping`);
    return false;
  }
  
  // Store plugin
  plugins.set(plugin.name, {
    name: plugin.name,
    version: plugin.version || '1.0.0',
    description: plugin.description || '',
    enabled: true,
    config: plugin.config || {},
    instance: null,
  });
  
  // Register hooks
  if (plugin.hooks) {
    for (const [hookName, handler] of Object.entries(plugin.hooks)) {
      addHook(hookName, handler, plugin.name);
    }
  }
  
  // Run init if provided
  if (typeof plugin.init === 'function') {
    try {
      plugins.get(plugin.name).instance = plugin.init(getPluginContext(plugin.name));
    } catch (err) {
      console.error(`Plugin "${plugin.name}" init failed:`, err);
    }
  }
  
  console.log(`Plugin registered: ${plugin.name} v${plugin.version || '1.0.0'}`);
  return true;
}

/**
 * Unregister a plugin
 */
export function unregisterPlugin(name) {
  if (!plugins.has(name)) return false;
  
  // Remove all hooks for this plugin
  for (const [hookName, handlers] of hooks.entries()) {
    hooks.set(hookName, handlers.filter(h => h.plugin !== name));
  }
  
  plugins.delete(name);
  return true;
}

/**
 * Get registered plugins
 */
export function getPlugins() {
  return Array.from(plugins.values());
}

/**
 * Enable/disable a plugin
 */
export function setPluginEnabled(name, enabled) {
  const plugin = plugins.get(name);
  if (plugin) {
    plugin.enabled = enabled;
    return true;
  }
  return false;
}

// ============================================================================
// Hook System
// ============================================================================

/**
 * Add a hook handler
 */
export function addHook(hookName, handler, pluginName = 'anonymous') {
  if (!hooks.has(hookName)) {
    hooks.set(hookName, []);
  }
  
  hooks.get(hookName).push({
    handler,
    plugin: pluginName,
    priority: handler.priority || 10,
  });
  
  // Sort by priority (lower = earlier)
  hooks.get(hookName).sort((a, b) => a.priority - b.priority);
}

/**
 * Remove a hook handler
 */
export function removeHook(hookName, handler) {
  if (!hooks.has(hookName)) return;
  
  hooks.set(hookName, hooks.get(hookName).filter(h => h.handler !== handler));
}

/**
 * Execute hooks (async waterfall - each hook can modify data)
 */
export async function executeHooks(hookName, data, context = {}) {
  if (!hooks.has(hookName)) return data;
  
  let result = data;
  
  for (const { handler, plugin } of hooks.get(hookName)) {
    // Skip disabled plugins
    const pluginData = plugins.get(plugin);
    if (pluginData && !pluginData.enabled) continue;
    
    try {
      const handlerResult = await handler(result, context);
      // If handler returns undefined, keep previous result
      if (handlerResult !== undefined) {
        result = handlerResult;
      }
    } catch (err) {
      console.error(`Hook "${hookName}" handler from "${plugin}" failed:`, err);
    }
  }
  
  return result;
}

/**
 * Execute hooks synchronously
 */
export function executeHooksSync(hookName, data, context = {}) {
  if (!hooks.has(hookName)) return data;
  
  let result = data;
  
  for (const { handler, plugin } of hooks.get(hookName)) {
    const pluginData = plugins.get(plugin);
    if (pluginData && !pluginData.enabled) continue;
    
    try {
      const handlerResult = handler(result, context);
      if (handlerResult !== undefined) {
        result = handlerResult;
      }
    } catch (err) {
      console.error(`Hook "${hookName}" handler from "${plugin}" failed:`, err);
    }
  }
  
  return result;
}

// ============================================================================
// Plugin Context
// ============================================================================

/**
 * Create a context object for plugins
 */
function getPluginContext(pluginName) {
  return {
    // Plugin info
    name: pluginName,
    
    // Hook management
    addHook: (hookName, handler) => addHook(hookName, handler, pluginName),
    removeHook,
    
    // Execute hooks (for plugin-to-plugin communication)
    executeHooks,
    
    // Storage (in-memory, per-request)
    store: new Map(),
    
    // Logging
    log: (...args) => console.log(`[${pluginName}]`, ...args),
    warn: (...args) => console.warn(`[${pluginName}]`, ...args),
    error: (...args) => console.error(`[${pluginName}]`, ...args),
    
    // Config access
    getConfig: () => plugins.get(pluginName)?.config || {},
    setConfig: (config) => {
      const plugin = plugins.get(pluginName);
      if (plugin) plugin.config = { ...plugin.config, ...config };
    },
  };
}

// ============================================================================
// Built-in Plugins
// ============================================================================

/**
 * Analytics plugin - tracks page views
 */
export const analyticsPlugin = {
  name: 'analytics',
  version: '1.0.0',
  description: 'Simple analytics tracking',
  
  config: {
    enabled: true,
  },
  
  hooks: {
    [HOOKS.REQUEST_START]: (data, ctx) => {
      const start = Date.now();
      ctx.analytics = { start, path: ctx.path };
      return data;
    },
    
    [HOOKS.REQUEST_END]: (data, ctx) => {
      if (ctx.analytics) {
        const duration = Date.now() - ctx.analytics.start;
        console.log(`[analytics] ${ctx.method} ${ctx.analytics.path} - ${duration}ms`);
      }
      return data;
    },
  },
};

/**
 * SEO plugin - enhances meta tags
 */
export const seoPlugin = {
  name: 'seo',
  version: '1.0.0',
  description: 'SEO enhancements',
  
  config: {
    siteName: 'NERD CMS',
    defaultDescription: 'Powered by NERD Language',
  },
  
  hooks: {
    [HOOKS.TEMPLATE_AFTER]: (html, ctx) => {
      // Add Open Graph tags
      const ogTags = `
        <meta property="og:title" content="${ctx.title || 'NERD CMS'}">
        <meta property="og:description" content="${ctx.description || 'Powered by NERD'}">
        <meta property="og:type" content="website">
        <meta property="og:url" content="${ctx.url || ''}">
      `;
      
      return html.replace('</head>', `${ogTags}</head>`);
    },
  },
};

/**
 * Cache plugin - simple response caching
 */
export const cachePlugin = {
  name: 'cache',
  version: '1.0.0',
  description: 'Response caching',
  
  config: {
    ttl: 60, // seconds
  },
  
  init: (ctx) => {
    ctx.cache = new Map();
    return { cache: ctx.cache };
  },
  
  hooks: {
    [HOOKS.REQUEST_START]: function(data, ctx) {
      const plugin = plugins.get('cache');
      if (plugin?.instance?.cache) {
        const cached = plugin.instance.cache.get(ctx.path);
        if (cached && Date.now() - cached.time < (plugin.config.ttl * 1000)) {
          ctx.cached = true;
          return cached.data;
        }
      }
      return data;
    },
    
    [HOOKS.REQUEST_END]: function(data, ctx) {
      if (!ctx.cached) {
        const plugin = plugins.get('cache');
        if (plugin?.instance?.cache) {
          plugin.instance.cache.set(ctx.path, { data, time: Date.now() });
        }
      }
      return data;
    },
  },
};

/**
 * Markdown plugin - converts markdown to HTML
 */
export const markdownPlugin = {
  name: 'markdown',
  version: '1.0.0',
  description: 'Markdown to HTML conversion',
  
  hooks: {
    [HOOKS.CONTENT_TRANSFORM]: (content, ctx) => {
      if (ctx.format !== 'markdown') return content;
      
      // Simple markdown conversion
      return content
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // Bold & Italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gm, (match) => {
          if (match.startsWith('<')) return match;
          return `<p>${match}</p>`;
        });
    },
  },
};

/**
 * Security headers plugin
 */
export const securityPlugin = {
  name: 'security',
  version: '1.0.0',
  description: 'Security headers',
  
  config: {
    csp: "default-src 'self'; style-src 'self' 'unsafe-inline'",
    xfo: 'DENY',
  },
  
  hooks: {
    [HOOKS.REQUEST_END]: (data, ctx) => {
      if (ctx.headers) {
        ctx.headers.set('X-Content-Type-Options', 'nosniff');
        ctx.headers.set('X-Frame-Options', data.config?.xfo || 'DENY');
        ctx.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      }
      return data;
    },
  },
};

// ============================================================================
// Initialize Default Plugins
// ============================================================================

export function initDefaultPlugins() {
  registerPlugin(analyticsPlugin);
  registerPlugin(seoPlugin);
  registerPlugin(markdownPlugin);
  registerPlugin(securityPlugin);
}

// ============================================================================
// Export for Worker
// ============================================================================

export default {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  setPluginEnabled,
  addHook,
  removeHook,
  executeHooks,
  executeHooksSync,
  initDefaultPlugins,
  HOOKS,
  
  // Built-in plugins
  plugins: {
    analytics: analyticsPlugin,
    seo: seoPlugin,
    cache: cachePlugin,
    markdown: markdownPlugin,
    security: securityPlugin,
  },
};
