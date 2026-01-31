#!/bin/bash
# TTS Utility Installation Script
# ================================
# Installs Qwen3-TTS and all dependencies for RTX 4090.

set -e

echo "=========================================="
echo "TTS Utility v1 - Installation"
echo "=========================================="

# Detect Python
if command -v conda &> /dev/null; then
    PYTHON_CMD="conda"
    echo "✓ Found conda"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo "✓ Found python3"
else
    echo "✗ Python not found. Please install Python 3.10+"
    exit 1
fi

# Create environment
echo ""
echo "Creating virtual environment..."

if [ "$PYTHON_CMD" = "conda" ]; then
    conda create -n tts-utility python=3.12 -y
    source "$(conda info --base)/etc/profile.d/conda.sh"
    conda activate tts-utility
else
    python3 -m venv tts-utility-env
    source tts-utility-env/bin/activate
fi

echo "✓ Environment activated"

# Install dependencies
echo ""
echo "Installing dependencies..."

pip install --upgrade pip

# Core dependencies
echo "Installing qwen-tts..."
pip install qwen-tts

echo "Installing audio processing..."
pip install soundfile librosa numpy

echo "Installing web framework..."
pip install flask flask-cors

echo "Installing OpenAI SDK..."
pip install openai

echo "Installing CLI tools..."
pip install click rich

echo "Installing utilities..."
pip install pydantic pydantic-settings python-dotenv

# Optional: FlashAttention for RTX 4090
echo ""
read -p "Install FlashAttention for RTX 4090 optimization? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing FlashAttention 2..."
    pip install flash-attn --no-build-isolation
    echo "✓ FlashAttention installed"
fi

# Create CLI entry point
echo ""
echo "Creating CLI entry point..."

INSTALL_DIR=$(pwd)
cat > tts-cli << 'EOF'
#!/usr/bin/env python3
import sys
from pathlib import Path

# Add tts_utility to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from cli.tts_cli import main

if __name__ == "__main__":
    main()
EOF

chmod +x tts-cli
echo "✓ CLI entry point created"

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "To use the CLI:"
echo "  $ cd $INSTALL_DIR"
echo "  $ conda activate tts-utility"
echo "  $ ./tts-cli 'Hello, world!' --output hello.wav"
echo ""
echo "To start the API server:"
echo "  $ python api/server.py --model 1.7b-custom --port 8091"
echo ""
