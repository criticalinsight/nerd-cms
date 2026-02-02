# NERD & LLVM Global Setup

# 1. Install NERD Globally
if [ -d "/usr/local/nerd" ]; then
    echo "Removing existing /usr/local/nerd..."
    rm -rf /usr/local/nerd
fi
echo "Moving NERD to /usr/local/nerd..."
mv nerd-darwin-arm64 /usr/local/nerd

# 2. Configure Shell (Zsh)
RC_FILE="$HOME/.zshrc"

if ! grep -q "/usr/local/nerd" "$RC_FILE"; then
    echo 'export PATH="$PATH:/usr/local/nerd"' >> "$RC_FILE"
    echo "Added NERD to PATH."
fi

if ! grep -q "/opt/homebrew/opt/llvm/bin" "$RC_FILE"; then
    echo 'export PATH="/opt/homebrew/opt/llvm/bin:$PATH"' >> "$RC_FILE"
    echo "Added LLVM to PATH."
fi

# 3. Apply changes to current session
export PATH="/opt/homebrew/opt/llvm/bin:$PATH:/usr/local/nerd"
echo "Setup complete. NERD and LLVM are ready."
nerd --version
llc --version
