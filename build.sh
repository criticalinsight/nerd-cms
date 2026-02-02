#!/bin/bash
# build.sh - Compile NERD CMS to WebAssembly for Cloudflare Workers
#
# Usage: ./build.sh [nerd_file]
# Default: cms.nerd

set -e

NERD_FILE="${1:-cms.nerd}"
BASENAME="${NERD_FILE%.nerd}"
LLVM_BIN="/opt/homebrew/opt/llvm/bin"

echo "=== NERD CMS Build Pipeline ==="
echo "[1/4] Compiling NERD -> LLVM IR"
./nerd-darwin-arm64/nerd compile "$NERD_FILE" -o "${BASENAME}.ll"

# Step 1.5: Inject missing declarations for runtime functions
echo "[1.5/4] Injecting external declarations"
# Insert declarations after the second line (after the header comments)
sed -i '' '3i\
declare double @print_buffer()\
declare double @wasm_get_shared_buffer()\
' "${BASENAME}.ll"

# Step 2: Compile LLVM IR to Wasm object
echo "[2/4] Compiling LLVM IR -> Wasm object"
$LLVM_BIN/clang --target=wasm32-unknown-unknown -O2 -c "${BASENAME}.ll" -o "${BASENAME}.o"

# Step 3: Compile runtime to Wasm object
echo "[3/4] Compiling runtime -> Wasm object"
$LLVM_BIN/clang --target=wasm32-unknown-unknown -O2 -c runtime_wasm.c -o runtime_wasm.o

# Step 4: Link into final Wasm module
echo "[4/4] Linking -> ${BASENAME}.wasm"
wasm-ld \
    --no-entry \
    --export-all \
    --export-memory \
    --allow-undefined \
    --initial-memory=524288 \
    -o "${BASENAME}.wasm" \
    "${BASENAME}.o" \
    runtime_wasm.o

echo "=== Build Complete ==="
echo "Output: ${BASENAME}.wasm"
ls -lh "${BASENAME}.wasm"
