# TTS Utility v1 - Deployment Guide

Complete guide for deploying Qwen3-TTS with vLLM-Omni on RTX 4090.

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| GPU | RTX 3060 (12GB) | RTX 4090 (24GB) |
| RAM | 16GB | 32GB |
| Storage | 20GB | 50GB SSD |

## Installation

### Quick Install

```bash
cd tts_utility/scripts
bash install.sh
```

### Manual Install

```bash
# Create environment
conda create -n tts-utility python=3.12 -y
conda activate tts-utility

# Install core
pip install qwen-tts vllm-omni

# Install dependencies
pip install soundfile librosa flask flask-cors openai click rich pydantic

# Optional: FlashAttention for RTX 4090
pip install flash-attn --no-build-isolation
```

## Deployment Options

### Option 1: Python API Server (Recommended for Development)

```bash
python api/server.py --model 1.7b-custom --port 8091
```

### Option 2: vLLM-Omni Server (Production)

```bash
cd scripts
bash deploy_vllm.sh "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice" 8091
```

### Option 3: Docker (Coming Soon)

```bash
docker build -t tts-utility .
docker run -p 8091:8091 --gpus all tts-utility
```

## RTX 4090 Optimization

Set these environment variables for optimal performance:

```bash
export TORCH_CUDA_ARCH_LIST="8.9"
export FLASH_ATTENTION_USE_DISTRIBUTED=1
export CUDA_VISIBLE_DEVICES=0

# Use BF16 for best performance
python api/server.py --model 1.7b-custom --precision bf16
```

## API Usage

### OpenAI Compatible

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8091/v1",
    api_key="EMPTY"
)

response = client.audio.speech.create(
    model="tts-1-hd",
    text="Hello from Qwen3-TTS!",
    voice="Vivian"
)

response.stream_to_file("output.wav")
```

### cURL

```bash
curl http://localhost:8091/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1-hd",
    "text": "Привет, мир!",
    "voice": "Vivian",
    "language": "Russian"
  }' \
  --output speech.wav
```

## Voice Cloning

```bash
# Using CLI
tts-cli clone reference.wav \
    --ref-text "This is the reference text" \
    --text "This is new text with cloned voice" \
    --output cloned.wav
```

## Performance Benchmarks (RTX 4090)

| Model | Load Time | RTF (Real-Time Factor) | VRAM |
|-------|-----------|------------------------|------|
| 0.6B-CustomVoice | ~5s | 0.08 | ~3GB |
| 1.7B-CustomVoice | ~10s | 0.15 | ~8GB |
| 1.7B-Base (clone) | ~10s | 0.18 | ~8GB |

RTF < 1.0 means faster than real-time.

## Troubleshooting

### Out of Memory

```bash
# Use smaller model
python api/server.py --model 0.6b-custom

# Or reduce GPU memory utilization
vllm serve Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice --omni --gpu-memory-utilization 0.7
```

### Slow Inference

```bash
# Enable FlashAttention
pip install flash-attn --no-build-isolation

# Use BF16 precision
python api/server.py --precision bf16
```

### Model Download Issues

```bash
# Manual download via ModelScope
pip install modelscope
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --local_dir ./models
```

## Sources

- [Qwen3-TTS GitHub](https://github.com/QwenLM/Qwen3-TTS)
- [vLLM-Omni Documentation](https://docs.vllm.ai/projects/vllm-omni/)
- [ModelScope](https://modelscope.cn/models/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)
