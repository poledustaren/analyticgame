#!/bin/bash
# vLLM-Omni Deployment Script for Qwen3-TTS
# ============================================
# Deploys Qwen3-TTS using vLLM-Omni for production inference.

set -e

MODEL=${1:-"Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"}
PORT=${2:-8091}
HOST=${3:-"0.0.0.0"}

echo "=========================================="
echo "vLLM-Omni TTS Deployment"
echo "=========================================="
echo "Model: $MODEL"
echo "Host: $HOST:$PORT"
echo ""

# Check if vllm-omni is installed
if ! python -c "import vllm" 2>/dev/null; then
    echo "Installing vLLM-Omni..."
    pip install vllm-omni
fi

echo "Starting vLLM-Omni server..."
echo ""

# Launch vLLM server with omni support
vllm serve "$MODEL" \
    --omni \
    --port "$PORT" \
    --host "$HOST" \
    --gpu-memory-utilization 0.9 \
    --dtype bfloat16 \
    --max-model-len 4096

echo ""
echo "Server started on http://$HOST:$PORT"
echo ""
echo "Test with:"
echo "  curl http://localhost:$PORT/health"
echo ""
