#!/usr/bin/env python3
"""
OpenAI-Compatible TTS API Server
=================================
Provides OpenAI-style endpoints for Qwen3-TTS.

Endpoints:
- GET  /v1/models          - List available models
- POST /v1/audio/speech    - Generate speech (OpenAI compatible)
- POST /v1/chat/completions - vLLM-Omni style chat completions

Usage:
    python server.py --model 1.7b-custom --port 8091
"""
import io
import os
import sys
import base64
from pathlib import Path
from typing import Optional, List, Literal

import torch
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from pydantic import BaseModel, Field

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.model_wrapper import Qwen3TTSWrapper, create_model

app = Flask(__name__)
CORS(app)

# Global model instance
model_wrapper: Optional[Qwen3TTSWrapper] = None


# ============================================================================
# Request/Response Models
# ============================================================================

class TTSRequest(BaseModel):
    """OpenAI-style TTS request."""
    model: str = "tts-1.7b"
    text: str
    voice: str = "Vivian"
    language: str = "Auto"
    instruct: Optional[str] = None
    ref_audio: Optional[str] = None
    ref_text: Optional[str] = None
    response_format: Literal["mp3", "opus", "aac", "flac", "wav", "pcm"] = "wav"
    speed: float = Field(default=1.0, ge=0.25, le=4.0)


class ModelInfo(BaseModel):
    """Model information."""
    id: str
    name: str
    type: str
    languages: List[str]
    speakers: Optional[List[str]] = None


class ModelsResponse(BaseModel):
    """Response for /v1/models endpoint."""
    object: str = "list"
    data: List[ModelInfo]


class ErrorResponse(BaseModel):
    """Error response."""
    error: dict


# ============================================================================
# Model Management
# ============================================================================

def get_model_name(requested_model: str) -> str:
    """Map OpenAI-style model names to Qwen3-TTS models."""
    model_map = {
        "tts-1": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "tts-1-hd": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "tts-1.7b": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "tts-0.6b": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "tts-clone": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "tts-design": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    }

    if requested_model in model_map:
        return model_map[requested_model]

    # Assume it's a direct model path
    return requested_model


def load_model(model_name: str, device: str = "cuda:0"):
    """Load or reload the TTS model."""
    global model_wrapper

    # Map model name if needed
    actual_model = get_model_name(model_name)

    # Check if we need to reload
    if model_wrapper is not None:
        if model_wrapper.config.model_name == actual_model:
            return  # Already loaded
        # Unload existing
        model_wrapper.unload()

    # Load new model
    model_wrapper = create_model(model=actual_model, device=device)
    model_wrapper.load()

    return model_wrapper


# ============================================================================
# Routes
# ============================================================================

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "model_loaded": model_wrapper is not None and model_wrapper.is_loaded
    })


@app.route("/v1/models", methods=["GET"])
def list_models():
    """List available models (OpenAI compatible)."""
    models = [
        ModelInfo(
            id="tts-1",
            name="Qwen3-TTS-0.6B-CustomVoice",
            type="custom",
            languages=["Chinese", "English", "Japanese", "Korean", "German", "French", "Russian", "Portuguese", "Spanish", "Italian"],
            speakers=["Vivian", "Serena", "Uncle_Fu", "Dylan", "Eric", "Ryan", "Aiden", "Ono_Anna", "Sohee"]
        ),
        ModelInfo(
            id="tts-1-hd",
            name="Qwen3-TTS-1.7B-CustomVoice",
            type="custom",
            languages=["Chinese", "English", "Japanese", "Korean", "German", "French", "Russian", "Portuguese", "Spanish", "Italian"],
            speakers=["Vivian", "Serena", "Uncle_Fu", "Dylan", "Eric", "Ryan", "Aiden", "Ono_Anna", "Sohee"]
        ),
        ModelInfo(
            id="tts-clone",
            name="Qwen3-TTS-1.7B-Base",
            type="clone",
            languages=["Chinese", "English", "Japanese", "Korean", "German", "French", "Russian", "Portuguese", "Spanish", "Italian"],
        ),
        ModelInfo(
            id="tts-design",
            name="Qwen3-TTS-1.7B-VoiceDesign",
            type="design",
            languages=["Chinese", "English", "Japanese", "Korean", "German", "French", "Russian", "Portuguese", "Spanish", "Italian"],
        ),
    ]

    return jsonify({
        "object": "list",
        "data": [m.model_dump() for m in models]
    })


@app.route("/v1/audio/speech", methods=["POST"])
def audio_speech():
    """
    Generate speech (OpenAI compatible).

    Request body:
        {
            "model": "tts-1-hd",
            "text": "Hello, world!",
            "voice": "Vivian",
            "language": "English",
            "response_format": "wav"
        }

    Returns audio file.
    """
    try:
        # Parse request
        data = request.get_json()
        req = TTSRequest(**data)

        # Load model
        load_model(req.model)

        # Synthesize
        model_name = get_model_name(req.model)

        if "clone" in req.model.lower() or req.ref_audio:
            # Voice cloning
            if not req.ref_audio:
                return jsonify({"error": "ref_audio required for cloning"}), 400
            result = model_wrapper.synthesize_voice_clone(
                text=req.text,
                ref_audio=req.ref_audio,
                ref_text=req.ref_text or "",
                language=req.language,
            )
        elif "design" in req.model.lower() or req.instruct:
            # Voice design
            if not req.instruct:
                return jsonify({"error": "instruct required for voice design"}), 400
            result = model_wrapper.synthesize_voice_design(
                text=req.text,
                instruct=req.instruct,
                language=req.language,
            )
        else:
            # Custom voice
            result = model_wrapper.synthesize_custom_voice(
                text=req.text,
                speaker=req.voice,
                language=req.language,
                instruct=req.instruct,
            )

        # Return audio
        audio_bytes = result.to_bytes(format=req.response_format.upper())

        # MIME type mapping
        mime_types = {
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "flac": "audio/flac",
            "opus": "audio/opus",
            "aac": "audio/aac",
            "pcm": "audio/pcm",
        }

        return Response(
            audio_bytes,
            mimetype=mime_types.get(req.response_format, "audio/wav"),
            headers={
                "Content-Disposition": f'attachment; filename="speech.{req.response_format}"',
                "X-Audio-Duration": str(result.duration),
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/v1/chat/completions", methods=["POST"])
def chat_completions():
    """
    vLLM-Omni style chat completions endpoint.

    Supports both text and audio output modalities.
    """
    try:
        data = request.get_json()

        model = data.get("model", "tts-1-hd")
        messages = data.get("messages", [])
        modalities = data.get("modalities", ["audio"])

        # Extract text from messages
        text = ""
        for msg in messages:
            if msg.get("role") == "user":
                content = msg.get("content", "")
                if isinstance(content, str):
                    text = content
                elif isinstance(content, list):
                    for item in content:
                        if item.get("type") == "text":
                            text += item.get("text", "")

        if not text:
            return jsonify({"error": "No text found in messages"}), 400

        # Load model
        load_model(model)

        # Synthesize
        result = model_wrapper.synthesize_custom_voice(
            text=text,
            speaker=data.get("speaker", "Vivian"),
            language=data.get("language", "Auto"),
            instruct=data.get("instruct"),
        )

        # Return based on modality
        if "audio" in modalities:
            # Return audio as base64
            audio_b64 = result.to_base64()
            return jsonify({
                "id": "chatcmpl-tts",
                "object": "chat.completion",
                "created": int(torch.tensor(0).item()),  # placeholder
                "model": model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": text,
                    },
                    "audio": {
                        "id": "audio_" + str(hash(text)),
                        "data": audio_b64.split(",")[1],
                        "format": "wav",
                        "duration": result.duration,
                    },
                    "finish_reason": "stop"
                }],
                "usage": {
                    "prompt_tokens": len(text.split()),
                    "completion_tokens": len(text.split()),
                    "total_tokens": len(text.split()) * 2,
                }
            })
        else:
            # Text only
            return jsonify({
                "id": "chatcmpl-tts",
                "object": "chat.completion",
                "model": model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": f"[Speech synthesized: {text}]",
                    },
                    "finish_reason": "stop"
                }]
            })

    except Exception as e:
        return jsonify({"error": {"message": str(e), "type": "tts_error"}}), 500


@app.route("/v1/audio/clone", methods=["POST"])
def voice_clone():
    """
    Voice cloning endpoint.

    Request body (multipart/form-data):
        - audio: Reference audio file (3 seconds)
        - text: Text to synthesize
        - ref_text: Reference audio transcript
        - language: Target language
    """
    try:
        # Get form data
        audio_file = request.files.get("audio")
        text = request.form.get("text")
        ref_text = request.form.get("ref_text", "")
        language = request.form.get("language", "Auto")

        if not audio_file or not text:
            return jsonify({"error": "audio and text required"}), 400

        # Load Base model
        load_model("tts-clone")

        # Read audio
        import soundfile as sf
        import io
        audio_bytes = audio_file.read()
        ref_audio, sr = sf.read(io.BytesIO(audio_bytes))

        # Clone
        result = model_wrapper.synthesize_voice_clone(
            text=text,
            ref_audio=(ref_audio, sr),
            ref_text=ref_text,
            language=language,
        )

        # Return audio
        output_bytes = result.to_bytes()
        return Response(
            output_bytes,
            mimetype="audio/wav",
            headers={
                "Content-Disposition": 'attachment; filename="cloned.wav"',
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Qwen3-TTS API Server")
    parser.add_argument("--model", "-m", default="1.7b-custom", help="Model to use")
    parser.add_argument("--host", default="0.0.0.0", help="Host address")
    parser.add_argument("--port", "-p", type=int, default=8091, help="Port")
    parser.add_argument("--device", default="cuda:0", help="CUDA device")
    parser.add_argument("--debug", action="store_true", help="Debug mode")
    args = parser.parse_args()

    # Preload model
    print(f"Loading model: {args.model}")
    load_model(args.model, device=args.device)
    print("Model loaded")

    print(f"Starting server on {args.host}:{args.port}")
    print(f"OpenAI-compatible endpoint: http://{args.host}:{args.port}/v1/audio/speech")

    app.run(host=args.host, port=args.port, debug=args.debug)
