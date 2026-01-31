"""
Qwen3-TTS Model Wrapper
=========================
Provides a unified interface for all Qwen3-TTS model types:
- CustomVoice: 9 preset speakers
- VoiceDesign: Natural language voice control
- Base: 3-second voice cloning

Optimized for RTX 4090 with FlashAttention 2 and BF16.
"""

import io
import base64
from pathlib import Path
from typing import Optional, Union, Literal, List, Tuple
from dataclasses import dataclass
from enum import Enum

import torch
import numpy as np
import soundfile as sf

try:
    from qwen_tts import Qwen3TTSModel, Qwen3TTSTokenizer
    QWEN_TTS_AVAILABLE = True
except ImportError:
    QWEN_TTS_AVAILABLE = False
    print("Warning: qwen-tts not installed. Run: pip install qwen-tts")


class ModelType(Enum):
    """Qwen3-TTS model types."""
    CUSTOM_VOICE = "CustomVoice"
    VOICE_DESIGN = "VoiceDesign"
    BASE = "Base"


class Precision(Enum):
    """Numerical precision for inference."""
    BF16 = "bfloat16"
    FP16 = "float16"
    FP32 = "float32"


@dataclass
class TTSConfig:
    """Configuration for TTS model."""
    model_name: str = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
    device: str = "cuda:0"
    precision: Precision = Precision.BF16
    flash_attention: bool = True
    max_new_tokens: int = 2048

    # RTX 4090 optimizations
    gpu_memory_utilization: float = 0.9
    compile_model: bool = False


@dataclass
class AudioOutput:
    """Container for TTS audio output."""
    waveform: np.ndarray
    sample_rate: int
    duration: float

    def to_file(self, path: Union[str, Path]):
        """Save audio to file."""
        sf.write(path, self.waveform, self.sample_rate)

    def to_bytes(self, format: str = "WAV") -> bytes:
        """Convert to bytes."""
        buffer = io.BytesIO()
        sf.write(buffer, self.waveform, self.sample_rate, format=format)
        return buffer.getvalue()

    def to_base64(self, format: str = "WAV") -> str:
        """Convert to base64 data URL."""
        data = self.to_bytes(format)
        b64 = base64.b64encode(data).decode("utf-8")
        return f"data/audio/{format.lower()};base64,{b64}"


class Qwen3TTSWrapper:
    """
    Unified wrapper for Qwen3-TTS models.

    Supports three model types:
    - CustomVoice: 9 preset speakers with style control
    - VoiceDesign: Natural language voice description
    - Base: 3-second voice cloning
    """

    # Supported languages
    LANGUAGES = [
        "Chinese", "English", "Japanese", "Korean",
        "German", "French", "Russian", "Portuguese",
        "Spanish", "Italian"
    ]

    # Preset speakers for CustomVoice
    SPEAKERS = {
        "Vivian": "Bright, slightly edgy young female voice",
        "Serena": "Warm, gentle young female voice",
        "Uncle_Fu": "Seasoned male voice with low, mellow timbre",
        "Dylan": "Youthful Beijing male voice with clear, natural timbre",
        "Eric": "Lively Chengdu male voice with husky brightness",
        "Ryan": "Dynamic male voice with strong rhythmic drive",
        "Aiden": "Sunny American male voice with clear midrange",
        "Ono_Anna": "Playful Japanese female voice with light, nimble timbre",
        "Sohee": "Warm Korean female voice with rich emotion",
    }

    # Model name mapping
    MODELS = {
        "1.7b-custom": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "1.7b-design": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "1.7b-base": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "0.6b-custom": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "0.6b-base": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
    }

    def __init__(self, config: Optional[TTSConfig] = None):
        self.config = config or TTSConfig()
        self.model: Optional[Qwen3TTSModel] = None
        self.model_type: Optional[ModelType] = None
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded and self.model is not None

    def load(self):
        """Load the TTS model."""
        if self._loaded:
            return

        if not QWEN_TTS_AVAILABLE:
            raise RuntimeError(
                "qwen-tts package not installed. "
                "Install with: pip install qwen-tts"
            )

        # Determine model type from model name
        model_name = self.config.model_name
        if "CustomVoice" in model_name or "custom" in model_name.lower():
            self.model_type = ModelType.CUSTOM_VOICE
        elif "VoiceDesign" in model_name or "design" in model_name.lower():
            self.model_type = ModelType.VOICE_DESIGN
        elif "Base" in model_name or "base" in model_name.lower():
            self.model_type = ModelType.BASE
        else:
            raise ValueError(f"Unknown model type: {model_name}")

        # Convert precision string to torch dtype
        dtype_map = {
            Precision.BF16: torch.bfloat16,
            Precision.FP16: torch.float16,
            Precision.FP32: torch.float32,
        }
        dtype = dtype_map[self.config.precision]

        # Load model
        print(f"Loading {model_name} on {self.config.device}...")
        self.model = Qwen3TTSModel.from_pretrained(
            model_name,
            device_map=self.config.device,
            dtype=dtype,
            attn_implementation="flash_attention_2" if self.config.flash_attention else None,
        )

        self._loaded = True
        print(f"Model loaded successfully!")

        # Print model info
        if self.model_type == ModelType.CUSTOM_VOICE:
            print(f"Available speakers: {', '.join(self.SPEAKERS.keys())}")
        elif self.model_type == ModelType.BASE:
            print("Voice cloning enabled (3-second samples)")
        elif self.model_type == ModelType.VOICE_DESIGN:
            print("Voice design enabled (natural language instructions)")

    def unload(self):
        """Unload the model from GPU memory."""
        if self.model is not None:
            del self.model
            self.model = None
        self._loaded = False
        torch.cuda.empty_cache()

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    def synthesize_custom_voice(
        self,
        text: str,
        speaker: str = "Vivian",
        language: str = "Auto",
        instruct: Optional[str] = None,
    ) -> AudioOutput:
        """
        Synthesize speech with CustomVoice model.

        Args:
            text: Input text to synthesize
            speaker: Preset speaker name
            language: Target language (or "Auto" for detection)
            instruct: Optional style instruction

        Returns:
            AudioOutput with generated speech
        """
        self._ensure_loaded()

        if self.model_type != ModelType.CUSTOM_VOICE:
            raise ValueError(
                f"CustomVoice synthesis requires CustomVoice model, "
                f"current model is {self.model_type}"
            )

        if speaker not in self.SPEAKERS:
            raise ValueError(
                f"Unknown speaker: {speaker}. "
                f"Available: {', '.join(self.SPEAKERS.keys())}"
            )

        wavs, sr = self.model.generate_custom_voice(
            text=text,
            language=language,
            speaker=speaker,
            instruct=instruct or "",
            max_new_tokens=self.config.max_new_tokens,
        )

        duration = len(wavs[0]) / sr
        return AudioOutput(waveform=wavs[0], sample_rate=sr, duration=duration)

    def synthesize_voice_design(
        self,
        text: str,
        instruct: str,
        language: str = "Auto",
    ) -> AudioOutput:
        """
        Synthesize speech with VoiceDesign model.

        Args:
            text: Input text to synthesize
            instruct: Natural language voice description
            language: Target language

        Returns:
            AudioOutput with generated speech
        """
        self._ensure_loaded()

        if self.model_type != ModelType.VOICE_DESIGN:
            raise ValueError(
                f"VoiceDesign synthesis requires VoiceDesign model, "
                f"current model is {self.model_type}"
            )

        wavs, sr = self.model.generate_voice_design(
            text=text,
            language=language,
            instruct=instruct,
            max_new_tokens=self.config.max_new_tokens,
        )

        duration = len(wavs[0]) / sr
        return AudioOutput(waveform=wavs[0], sample_rate=sr, duration=duration)

    def synthesize_voice_clone(
        self,
        text: str,
        ref_audio: Union[str, Path, Tuple[np.ndarray, int]],
        ref_text: Optional[str] = None,
        language: str = "Auto",
        x_vector_only: bool = False,
    ) -> AudioOutput:
        """
        Clone a voice from 3-second reference audio.

        Args:
            text: Input text to synthesize
            ref_audio: Reference audio (path, URL, or (numpy, sr) tuple)
            ref_text: Transcript of reference audio (optional if x_vector_only=True)
            language: Target language
            x_vector_only: Use only speaker embedding (faster, lower quality)

        Returns:
            AudioOutput with cloned voice
        """
        self._ensure_loaded()

        if self.model_type != ModelType.BASE:
            raise ValueError(
                f"Voice cloning requires Base model, "
                f"current model is {self.model_type}"
            )

        wavs, sr = self.model.generate_voice_clone(
            text=text,
            language=language,
            ref_audio=ref_audio,
            ref_text=ref_text or "",
            max_new_tokens=self.config.max_new_tokens,
            x_vector_only_mode=x_vector_only,
        )

        duration = len(wavs[0]) / sr
        return AudioOutput(waveform=wavs[0], sample_rate=sr, duration=duration)

    def create_clone_prompt(
        self,
        ref_audio: Union[str, Path, Tuple[np.ndarray, int]],
        ref_text: str,
        x_vector_only: bool = False,
    ):
        """
        Create reusable voice clone prompt.

        Use this to avoid recomputing features for the same reference audio.
        """
        self._ensure_loaded()

        if self.model_type != ModelType.BASE:
            raise ValueError("Clone prompt requires Base model")

        return self.model.create_voice_clone_prompt(
            ref_audio=ref_audio,
            ref_text=ref_text,
            x_vector_only_mode=x_vector_only,
        )

    def batch_synthesize_custom_voice(
        self,
        texts: List[str],
        speakers: List[str],
        languages: List[str],
        instructs: Optional[List[str]] = None,
    ) -> List[AudioOutput]:
        """Batch synthesis for CustomVoice model."""
        self._ensure_loaded()

        if len(texts) != len(speakers) or len(texts) != len(languages):
            raise ValueError("Batch inputs must have same length")

        instructs = instructs or [""] * len(texts)

        wavs, sr = self.model.generate_custom_voice(
            text=texts,
            language=languages,
            speaker=speakers,
            instruct=instructs,
            max_new_tokens=self.config.max_new_tokens,
        )

        outputs = []
        for wav in wavs:
            duration = len(wav) / sr
            outputs.append(AudioOutput(waveform=wav, sample_rate=sr, duration=duration))
        return outputs

    def get_supported_speakers(self) -> List[str]:
        """Get list of supported speakers (CustomVoice only)."""
        return list(self.SPEAKERS.keys())

    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages."""
        return self.LANGUAGES.copy()


def create_model(
    model: str = "1.7b-custom",
    device: str = "cuda:0",
    precision: str = "bf16",
) -> Qwen3TTSWrapper:
    """
    Factory function to create a TTS model.

    Args:
        model: Model identifier (e.g., "1.7b-custom", "0.6b-base")
        device: CUDA device (e.g., "cuda:0", "cuda:1")
        precision: Precision ("bf16", "fp16", "fp32")

    Returns:
        Qwen3TTSWrapper instance
    """
    # Map short names to full model names
    if model in Qwen3TTSWrapper.MODELS:
        model_name = Qwen3TTSWrapper.MODELS[model]
    else:
        model_name = model

    # Map precision string
    precision_map = {
        "bf16": Precision.BF16,
        "fp16": Precision.FP16,
        "fp32": Precision.FP32,
    }
    precision_enum = precision_map.get(precision.lower(), Precision.BF16)

    config = TTSConfig(
        model_name=model_name,
        device=device,
        precision=precision_enum,
        flash_attention=True,
    )

    return Qwen3TTSWrapper(config)


# Tokenizer wrapper for audio encoding/decoding
class Qwen3Tokenizer:
    """Wrapper for Qwen3-TTS tokenizer."""

    def __init__(self, device: str = "cuda:0"):
        if not QWEN_TTS_AVAILABLE:
            raise RuntimeError("qwen-tts package not installed")

        self.tokenizer = Qwen3TTSTokenizer.from_pretrained(
            "Qwen/Qwen3-TTS-Tokenizer-12Hz",
            device_map=device,
        )

    def encode(
        self,
        audio: Union[str, Path, np.ndarray, Tuple[np.ndarray, int]]
    ) -> dict:
        """Encode audio to discrete codes."""
        return self.tokenizer.encode(audio)

    def decode(self, codes: dict) -> Tuple[np.ndarray, int]:
        """Decode codes back to audio."""
        return self.tokenizer.decode(codes)
