#!/bin/bash
# Install FlashAttention 2 for RTX 4090 optimization
# CRITICAL for achieving RTF < 1.0 in Qwen3-TTS

set -e

echo "======================================"
echo "FlashAttention 2 Installation Script"
echo "======================================"
echo ""

# Check CUDA
if ! command -v nvcc &> /dev/null; then
    echo "⚠ WARNING: nvcc not found in PATH"
    echo "  CUDA toolkit may not be properly installed"
    echo ""
fi

# Check GPU
if command -v nvidia-smi &> /dev/null; then
    echo "✓ GPU detected:"
    nvidia-smi --query-gpu=name,compute_cap --format=csv,noheader
    echo ""
else
    echo "✗ ERROR: nvidia-smi not found. Is NVIDIA driver installed?"
    exit 1
fi

# Check Python
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "✗ ERROR: Python not found"
    exit 1
fi

PYTHON_CMD=$(command -v python3 || command -v python)
echo "✓ Using Python: $($PYTHON_CMD --version)"
echo ""

# Check PyTorch
echo "Checking PyTorch installation..."
if $PYTHON_CMD -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}')" 2>/dev/null; then
    echo "✓ PyTorch is installed with CUDA support"
else
    echo "✗ ERROR: PyTorch not found or CUDA not available"
    echo "  Install first: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121"
    exit 1
fi
echo ""

# Check existing FlashAttention
echo "Checking FlashAttention 2 installation..."
if pip show flash-attn &> /dev/null; then
    echo "⚠ FlashAttention is already installed:"
    pip show flash-attn | grep Version
    echo ""
    read -p "Reinstall? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping installation."
        exit 0
    fi
    pip uninstall -y flash-attn
fi

# Install FlashAttention 2
echo "======================================"
echo "Installing FlashAttention 2..."
echo "======================================"
echo ""
echo "This may take 10-30 minutes depending on your system."
echo ""

pip install -U flash-attn --no-build-isolation

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✓ FlashAttention 2 installed successfully!"
    echo "======================================"
    echo ""
    echo "Verifying installation..."
    $PYTHON_CMD -c "import flash_attn; print(f'FlashAttention version: {flash_attn.__version__}')"
    echo ""
    echo "FlashAttention 2 is ready for use with Qwen3-TTS."
    echo "Run the benchmark to verify performance:"
    echo "  python benchmark.py"
else
    echo ""
    echo "✗ Installation failed!"
    echo ""
    echo "Common issues:"
    echo "  - CUDA toolkit not in PATH"
    echo "  - GPU compute capability < 7.5"
    echo "  - Insufficient disk space for compilation"
    echo ""
    echo "For troubleshooting, see:"
    echo "  https://github.com/Dao-AILab/flash-attention"
    exit 1
fi
