/**
 * worker.js - Minimal Cloudflare Worker Bootloader for NERD CMS
 *
 * This is the thinnest possible JavaScript layer required by Cloudflare Workers.
 * All CMS logic (routing, templates, content) is in NERD/WebAssembly.
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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    currentPath = url.pathname || "/";
    currentMethod = request.method;
    outputBuffer = [];

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

      // Reset heap and call NERD main
      if (instance.exports.wasm_reset_heap) instance.exports.wasm_reset_heap();
      
      // Route to different NERD functions based on path
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
