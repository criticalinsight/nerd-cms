/**
 * worker.js - Cloudflare Worker that runs NERD CMS
 *
 * This is the JavaScript "host" that loads and runs the NERD Wasm module,
 * providing implementations for the imported functions (console, fetch).
 */

import wasmModule from "../cms.wasm";

// Collected console output during request handling
let outputBuffer = [];

// Helper: Read a null-terminated string from Wasm memory
function readCString(memory, ptr) {
  const bytes = new Uint8Array(memory.buffer);
  let end = ptr;
  while (bytes[end] !== 0 && end < bytes.length) end++;
  return new TextDecoder().decode(bytes.subarray(ptr, end));
}

// Create the import object for the Wasm module
function createImports(memory) {
  return {
    env: {
      memory: memory,

      // Console output - called by puts() and printf() in runtime
      js_print_string: (ptr) => {
        const str = readCString(memory, ptr);
        outputBuffer.push(str);
        console.log("[NERD]", str);
      },

      js_print_number: (num) => {
        // Format like %g - remove trailing zeros
        const formatted = Number.isInteger(num) ? String(num) : num.toPrecision(6).replace(/\.?0+$/, '');
        outputBuffer.push(formatted);
        console.log("[NERD]", formatted);
      },

      // puts() - clang may optimize printf("%s\n", str) to puts(str)
      puts: (ptr) => {
        const str = readCString(memory, ptr);
        outputBuffer.push(str);
        console.log("[NERD]", str);
        return 0;
      },

      // printf() stub (variadic, complex to implement in JS - our C runtime handles it)
      printf: () => {
        console.log("[NERD] printf called (stub)");
        return 0;
      },
    },
  };
}

export default {
  async fetch(request, env, ctx) {
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

      // Return collected output as the response
      return new Response(outputBuffer.join("\n") + "\n", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
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
