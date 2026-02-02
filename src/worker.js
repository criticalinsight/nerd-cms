/**
 * worker.js - Cloudflare Worker that runs NERD CMS
 *
 * This is the JavaScript "host" that loads and runs the NERD Wasm module,
 * providing implementations for the imported functions (console, fetch).
 */

import wasmModule from "../cms.wasm";
import { homeTemplate, postTemplate, aboutTemplate, notFoundTemplate } from "./templates.js";

// Collected console output during request handling
let outputBuffer = [];

// Helper: Read a null-terminated string from Wasm memory
function readCString(memory, ptr) {
  const bytes = new Uint8Array(memory.buffer);
  let end = ptr;
  while (bytes[end] !== 0 && end < bytes.length) end++;
  return new TextDecoder().decode(bytes.subarray(ptr, end));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Reset output buffer for each request
    outputBuffer = [];

    try {
      // Instantiate the Wasm module - it exports its own memory with data segments
      const instance = await WebAssembly.instantiate(wasmModule, {
        env: {
          // puts() - clang optimizes printf("%s\n", str) to puts(str)
          puts: (ptr) => {
            const str = readCString(instance.exports.memory, ptr);
            outputBuffer.push(str);
            console.log("[NERD]", str);
            return 0;
          },

          // js_print_string - called by our runtime
          js_print_string: (ptr) => {
            const str = readCString(instance.exports.memory, ptr);
            outputBuffer.push(str);
            console.log("[NERD]", str);
          },

          js_print_number: (num) => {
            const formatted = Number.isInteger(num) ? String(num) : num.toPrecision(6).replace(/\.?0+$/, '');
            outputBuffer.push(formatted);
            console.log("[NERD]", formatted);
          },

          printf: () => 0,  // Stub - handled by our C runtime
        },
      });

      // Call main() if exported
      if (instance.exports.main) {
        instance.exports.main();
      }

      // Route handling with themed templates
      let html;
      
      if (path === "/" || path === "") {
        // Home page with NERD output
        html = homeTemplate({ 
          posts: [
            {
              slug: "/blog/hello-world",
              title: "Welcome to NERD CMS",
              date: new Date().toISOString(),
              excerpt: outputBuffer.join(" ")
            }
          ]
        });
      } else if (path === "/about") {
        html = aboutTemplate();
      } else if (path.startsWith("/blog")) {
        // Blog post
        html = postTemplate({
          title: "NERD Output",
          content: `<p>${outputBuffer.map(escapeHtml).join("</p><p>")}</p>`,
          date: new Date().toISOString(),
          author: "NERD Runtime"
        });
      } else if (path === "/raw") {
        // Raw text output (original behavior)
        return new Response(outputBuffer.join("\n") + "\n", {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Powered-By": "NERD-CMS",
          },
        });
      } else {
        html = notFoundTemplate();
      }

      return new Response(html, {
        status: path === "/404" ? 404 : 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Powered-By": "NERD-CMS",
        },
      });
    } catch (error) {
      return new Response(`NERD CMS Error: ${error.message}\n${error.stack}`, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
  },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
