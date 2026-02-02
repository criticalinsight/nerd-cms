# NERD CMS

> A Content Management System powered by the NERD programming language, running on Cloudflare Workers via WebAssembly.

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![NERD Language](https://img.shields.io/badge/NERD-Language-blueviolet)](https://github.com/Nerd-Lang/nerd-lang-core)

## 🚀 Live Demo

**[https://nerd-cms.iamkingori.workers.dev/](https://nerd-cms.iamkingori.workers.dev/)**

## Overview

NERD CMS demonstrates the power of the NERD programming language compiled to WebAssembly and running on Cloudflare's edge network. This project showcases:

- **NERD-to-Wasm Compilation**: Complete build pipeline from NERD source → LLVM IR → WebAssembly
- **Edge Computing**: Zero cold-start serverless execution on Cloudflare Workers
- **Minimal Footprint**: ~3KB Wasm binary with custom runtime

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  cms.nerd   │ → │   cms.ll    │ → │   cms.o     │ → │  cms.wasm   │
│ NERD Source │    │  LLVM IR    │    │ Wasm Object │    │ Final Binary│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                               ↓
                                              ┌─────────────────────────┐
                                              │   worker.js (Host)      │
                                              │ Cloudflare Worker Entry │
                                              └─────────────────────────┘
```

## Prerequisites

- [NERD Language](https://github.com/Nerd-Lang/nerd-lang-core) compiler
- LLVM with `clang` and `wasm-ld`
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Node.js

### macOS Installation

```bash
# Install LLVM with Wasm support
brew install llvm

# Install Wrangler
npm install -g wrangler
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/criticalinsight/nerd-cms.git
cd nerd-cms

# Build the Wasm module
./build.sh

# Run locally
wrangler dev

# Deploy to Cloudflare
wrangler deploy
```

## Project Structure

```
nerdcms/
├── cms.nerd           # NERD source code
├── cms.wasm           # Compiled WebAssembly binary
├── runtime_wasm.c     # NERD runtime for Wasm (printf, memory)
├── build.sh           # Build pipeline script
├── src/
│   └── worker.js      # Cloudflare Worker entry point
└── wrangler.toml      # Wrangler configuration
```

## Build Pipeline

The `build.sh` script executes a 4-step compilation process:

| Step | Input → Output                      | Tool                  |
| ---- | ----------------------------------- | --------------------- |
| 1    | `cms.nerd` → `cms.ll`               | NERD compiler         |
| 2    | `cms.ll` → `cms.o`                  | Clang (wasm32 target) |
| 3    | `runtime_wasm.c` → `runtime_wasm.o` | Clang (wasm32 target) |
| 4    | `*.o` → `cms.wasm`                  | wasm-ld               |

## Runtime

The `runtime_wasm.c` provides NERD's standard library functions compiled to WebAssembly:

- **I/O**: `printf`, `puts` → delegates to JS host
- **Memory**: Bump allocator with 64KB heap
- **HTTP/JSON/MCP**: Stub implementations (extensible)

## Configuration

Edit `wrangler.toml` to customize deployment:

```toml
name = "nerd-cms"
main = "src/worker.js"
compatibility_date = "2024-01-01"

[build]
command = "./build.sh"
```

## License

MIT

---

_Built with [NERD](https://nerd-lang.org) - No Effort Required, Done_ 🧠
