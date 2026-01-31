# TTS Utility v1: Qwen3-TTS + vLLM-Omni

> Production-ready Text-to-Speech utility with voice cloning, 10 languages, and RTX 4090 optimization.

## Features

- **Three Model Types**:
  - **CustomVoice**: 9 premium preset speakers
  - **VoiceDesign**: Natural language voice control
  - **Base**: 3-second rapid voice cloning

- **10 Languages**: Chinese, English, Japanese, Korean, German, French, **Russian**, Portuguese, Spanish, Italian

- **Ultra-Low Latency**: 97ms streaming synthesis

- **OpenAI-Compatible API**: Drop-in replacement for OpenAI TTS

- **CLI Tool**: Simple `tts-cli` command for quick synthesis

## Quick Start

### Installation

```bash
# Create environment
conda create -n tts-utility python=3.12 -y
conda activate tts-utility

# Install dependencies
cd tts_utility
pip install -r requirements.txt

# Optional: FlashAttention for RTX 4090
pip install flash-attn --no-build-isolation
```

### CLI Usage

```bash
# Basic synthesis
tts-cli "Hello, world!" --output hello.wav

# Voice cloning (3 second sample)
tts-cli "This is a cloned voice." \
    --ref-audio reference.wav \
    --ref-text "Reference transcript here." \
    --output cloned.wav

# Custom voice with speaker
tts-cli "Привет, мир!" \
    --speaker Vivian \
    --language Russian \
    --output hello_ru.wav

# Voice design with instruction
tts-cli "The quick brown fox jumps over the lazy dog." \
    --model VoiceDesign \
    --instruct "Speak in an excited, energetic tone with high pitch variation." \
    --output designed.wav
```

### API Server

```bash
# Start OpenAI-compatible API server
python api/server.py --model Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --port 8091
```

### OpenAI SDK Usage

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8091/v1",
    api_key="EMPTY"
)

response = client.audio.speech.create(
    model="tts-1.7b",
    text="Hello from Qwen3-TTS!",
    voice="Vivian"
)

response.stream_to_file("output.wav")
```

## Model Selection

| Model | Use Case | VRAM |
|-------|----------|------|
| `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` | Production with 9 preset speakers | ~8GB |
| `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign` | Natural language voice control | ~8GB |
| `Qwen/Qwen3-TTS-12Hz-1.7B-Base` | Voice cloning (3-sec samples) | ~8GB |
| `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice` | Edge deployment | ~3GB |
| `Qwen/Qwen3-TTS-12Hz-0.6B-Base` | Light cloning | ~3GB |

## Preset Speakers (CustomVoice)

| Speaker | Voice | Native Language |
|---------|-------|-----------------|
| Vivian | Bright, young female | Chinese |
| Serena | Warm, gentle female | Chinese |
| Uncle_Fu | Low, mellow male | Chinese |
| Dylan | Beijing dialect male | Chinese |
| Eric | Chengdu dialect male | Chinese |
| Ryan | Dynamic male | English |
| Aiden | Sunny American male | English |
| Ono_Anna | Playful female | Japanese |
| Sohee | Warm female | Korean |

## RTX 4090 Optimization

The utility automatically applies RTX 4090 optimizations:
- FlashAttention 2 for reduced memory
- BF16 precision for faster computation
- TensorRT compatibility (via vLLM)

```bash
# Enable optimizations
export TORCH_CUDA_ARCH_LIST="8.9"  # RTX 4090
export FLASH_ATTENTION_USE_DISTRIBUTED=1
```

## API Endpoints

### `/v1/audio/speech` (OpenAI Compatible)

```bash
curl http://localhost:8091/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1.7b",
    "text": "Hello, world!",
    "voice": "Vivian",
    "language": "English"
  }' \
  --output speech.wav
```

### `/v1/chat/completions` (vLLM-Omni)

```bash
curl http://localhost:8091/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
    "messages": [{"role": "user", "content": "Say hello in Russian."}],
    "modalities": ["audio"]
  }'
```

## License

This utility uses Qwen3-TTS which is open-source. See the [Qwen3-TTS repository](https://github.com/QwenLM/Qwen3-TTS) for details.

## Sources

- [Qwen3-TTS GitHub](https://github.com/QwenLM/Qwen3-TTS)
- [vLLM-Omni Documentation](https://docs.vllm.ai/projects/vllm-omni/en/latest/)
- [Qwen3-TTS on ModelScope](https://modelscope.cn/models/Qwen/Qwen3-TTS-12Hz-1.7B-Base)
