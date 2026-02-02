/**
 * runtime_wasm.c - NERD Runtime for WebAssembly (Cloudflare Workers)
 *
 * This file provides implementations for NERD's external symbols, delegating
 * I/O operations to JavaScript imports. Compiled with:
 *   clang --target=wasm32-unknown-unknown -O2 -c runtime_wasm.c -o runtime_wasm.o
 */

// ============================================================================
// WASM Imports (provided by JavaScript host)
// ============================================================================

// Console output
__attribute__((import_module("env"), import_name("js_print_string")))
extern void js_print_string(const char* str);

__attribute__((import_module("env"), import_name("js_print_number")))
extern void js_print_number(double num);

// Memory allocation from JS (for strings returned from HTTP, etc.)
__attribute__((export_name("wasm_alloc")))
char* wasm_alloc(int size);

__attribute__((export_name("wasm_free")))
void wasm_free(char* ptr);

// ============================================================================
// Simple Memory Management
// ============================================================================

static char heap[65536];  // 64KB heap
static int heap_offset = 0;

char* wasm_alloc(int size) {
    if (heap_offset + size > (int)sizeof(heap)) return 0;
    char* ptr = &heap[heap_offset];
    heap_offset += size;
    return ptr;
}

void wasm_free(char* ptr) {
    (void)ptr;  // No-op for bump allocator
}

// ============================================================================
// String Helpers
// ============================================================================

static int my_strlen(const char* s) {
    int len = 0;
    while (s && s[len]) len++;
    return len;
}

// ============================================================================
// printf / puts Implementations (NERD uses printf for 'out')
// ============================================================================

// The LLVM optimizer may convert printf("%s\n", str) to puts(str)
int puts(const char* str) {
    js_print_string(str);
    return 0;
}

// Variadic printf - we handle the two formats NERD uses:
// "%s\n" -> print string
// "%g\n" -> print number
// We use __builtin_va_* for wasm32
int printf(const char* fmt, ...) {
    // Check format string to determine type
    // "%s\n" = print string, "%g\n" = print number
    
    __builtin_va_list args;
    __builtin_va_start(args, fmt);
    
    // Simple format detection
    if (fmt[0] == '%' && fmt[1] == 's') {
        const char* str = __builtin_va_arg(args, const char*);
        js_print_string(str);
    } else if (fmt[0] == '%' && (fmt[1] == 'g' || fmt[1] == 'f' || fmt[1] == '.')) {
        double num = __builtin_va_arg(args, double);
        js_print_number(num);
    } else {
        // Unknown format, try to print as string
        js_print_string(fmt);
    }
    
    __builtin_va_end(args);
    return 0;
}

// ============================================================================
// HTTP Runtime Stubs
// ============================================================================

char* nerd_http_get(const char* url) { (void)url; return 0; }
char* nerd_http_post(const char* url, const char* body) { (void)url; (void)body; return 0; }
void nerd_http_free(char* ptr) { (void)ptr; }
char* nerd_http_get_json(const char* url) { (void)url; return 0; }
char* nerd_http_post_json(const char* url, const char* body) { (void)url; (void)body; return 0; }
char* nerd_http_post_json_body(const char* url, const char* body) { (void)url; (void)body; return 0; }
char* nerd_http_request(const char* m, const char* u, const char* h, const char* b) { (void)m;(void)u;(void)h;(void)b; return 0; }
char* nerd_http_get_full(const char* url, const char* h) { (void)url;(void)h; return 0; }
char* nerd_http_post_full(const char* u, const char* b, const char* h) { (void)u;(void)b;(void)h; return 0; }
char* nerd_http_put(const char* u, const char* b, const char* h) { (void)u;(void)b;(void)h; return 0; }
char* nerd_http_delete(const char* u, const char* h) { (void)u;(void)h; return 0; }
char* nerd_http_patch(const char* u, const char* b, const char* h) { (void)u;(void)b;(void)h; return 0; }
char* nerd_http_auth_bearer(const char* t) { (void)t; return 0; }
char* nerd_http_auth_basic(const char* u, const char* p) { (void)u;(void)p; return 0; }

// ============================================================================
// MCP Stubs
// ============================================================================

char* nerd_mcp_list(const char* url) { (void)url; return 0; }
char* nerd_mcp_send(const char* u, const char* m, const char* p) { (void)u;(void)m;(void)p; return 0; }
char* nerd_mcp_use(const char* u, const char* t, const char* a) { (void)u;(void)t;(void)a; return 0; }
char* nerd_mcp_init(const char* url) { (void)url; return 0; }
char* nerd_mcp_resources(const char* url) { (void)url; return 0; }
char* nerd_mcp_read(const char* u, const char* uri) { (void)u;(void)uri; return 0; }
char* nerd_mcp_prompts(const char* url) { (void)url; return 0; }
char* nerd_mcp_prompt(const char* u, const char* n, const char* a) { (void)u;(void)n;(void)a; return 0; }
char* nerd_mcp_log(const char* u, const char* l) { (void)u;(void)l; return 0; }
void nerd_mcp_free(char* ptr) { (void)ptr; }

// ============================================================================
// LLM Stubs
// ============================================================================

char* nerd_llm_claude(const char* prompt) { (void)prompt; return 0; }
void nerd_llm_free(char* ptr) { (void)ptr; }

// ============================================================================
// JSON Stubs
// ============================================================================

char* nerd_json_new(void) { return 0; }
char* nerd_json_parse(const char* json) { (void)json; return 0; }
char* nerd_json_get_string(const char* j, const char* p) { (void)j;(void)p; return 0; }
double nerd_json_get_number(const char* j, const char* p) { (void)j;(void)p; return 0; }
int nerd_json_get_bool(const char* j, const char* p) { (void)j;(void)p; return 0; }
char* nerd_json_get_object(const char* j, const char* p) { (void)j;(void)p; return 0; }
int nerd_json_count(const char* j, const char* p) { (void)j;(void)p; return 0; }
int nerd_json_has(const char* j, const char* p) { (void)j;(void)p; return 0; }
void nerd_json_set_string(char* j, const char* p, const char* v) { (void)j;(void)p;(void)v; }
void nerd_json_set_number(char* j, const char* p, double v) { (void)j;(void)p;(void)v; }
void nerd_json_set_bool(char* j, const char* p, int v) { (void)j;(void)p;(void)v; }
char* nerd_json_stringify(const char* json) { (void)json; return 0; }
void nerd_json_free(char* ptr) { (void)ptr; }
void nerd_json_free_string(char* ptr) { (void)ptr; }
