#!/usr/bin/env python3
"""
TTS-CLI: Command-line interface for Qwen3-TTS
==============================================
A simple and powerful CLI for text-to-speech synthesis.

Examples:
    tts-cli "Hello, world!" --output hello.wav
    tts-cli "Привет, мир!" --speaker Vivian --language Russian
    tts-cli "Cloned voice" --ref-audio voice.wav --ref-text "Reference text"
"""

import sys
import json
from pathlib import Path
from typing import Optional

import click
import numpy as np

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

from backend.model_wrapper import (
    Qwen3TTSWrapper,
    create_model,
    ModelType,
)

if RICH_AVAILABLE:
    console = Console()
else:
    console = None  # Fallback to plain print


def print_success(msg: str):
    if console:
        console.print(f"[green]✓[/green] {msg}")
    else:
        print(f"✓ {msg}")


def print_error(msg: str):
    if console:
        console.print(f"[red]✗[/red] {msg}")
    else:
        print(f"✗ {msg}")


def print_info(msg: str):
    if console:
        console.print(f"[blue]ℹ[/blue] {msg}")
    else:
        print(f"ℹ {msg}")


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """TTS-CLI: Text-to-Speech with Qwen3-TTS.

    Supports voice cloning, 10 languages, and multiple model types.
    """
    pass


@cli.command()
@click.argument("text", required=False)
@click.option("--text-file", "-f", type=click.Path(exists=True), help="Read text from file")
@click.option("--output", "-o", type=click.Path(), default="output.wav", help="Output audio file")
@click.option("--model", "-m", default="1.7b-custom", help="Model to use (1.7b-custom, 1.7b-design, 1.7b-base, 0.6b-custom, 0.6b-base)")
@click.option("--speaker", "-s", default="Vivian", help="Preset speaker (CustomVoice only)")
@click.option("--language", "-l", default="Auto", help="Target language")
@click.option("--instruct", "-i", help="Voice instruction (VoiceDesign only)")
@click.option("--ref-audio", help="Reference audio for cloning (Base only)")
@click.option("--ref-text", help="Reference audio transcript (Base only)")
@click.option("--device", default="cuda:0", help="CUDA device")
@click.option("--precision", default="bf16", type=click.Choice(["bf16", "fp16", "fp32"]), help="Numerical precision")
@click.option("--format", type=click.Choice(["wav", "mp3", "flac", "ogg"]), default="wav", help="Output format")
def synthesize(
    text: Optional[str],
    text_file: Optional[str],
    output: str,
    model: str,
    speaker: str,
    language: str,
    instruct: Optional[str],
    ref_audio: Optional[str],
    ref_text: Optional[str],
    device: str,
    precision: str,
    format: str,
):
    """Synthesize speech from text.

    Examples:
        tts-cli synthesize "Hello, world!"
        tts-cli synthesize -f input.txt -o output.wav --speaker Ryan
        tts-cli synthesize "Cloned voice" --ref-audio ref.wav --ref-text "Reference"
    """
    # Get text from file if provided
    if text_file:
        text = Path(text_file).read_text(encoding="utf-8")

    if not text:
        print_error("No text provided. Use --text or --text-file")
        sys.exit(1)

    # Show banner
    if console:
        console.print(Panel.fit(
            f"[bold cyan]TTS-CLI v1.0[/bold cyan]\n"
            f"Model: {model}\n"
            f"Device: {device} ({precision})",
            title="Qwen3-TTS"
        ))

    # Load model
    print_info("Loading model...")
    try:
        wrapper = create_model(model=model, device=device, precision=precision)
        wrapper.load()
    except Exception as e:
        print_error(f"Failed to load model: {e}")
        sys.exit(1)

    print_success("Model loaded")

    # Synthesize
    print_info(f"Synthesizing: {text[:50]}{'...' if len(text) > 50 else ''}")

    try:
        if "base" in model.lower():
            # Voice cloning mode
            if not ref_audio:
                print_error("--ref-audio required for Base model")
                sys.exit(1)
            result = wrapper.synthesize_voice_clone(
                text=text,
                ref_audio=ref_audio,
                ref_text=ref_text or "",
                language=language,
            )
        elif "design" in model.lower():
            # Voice design mode
            if not instruct:
                print_error("--instruct required for VoiceDesign model")
                sys.exit(1)
            result = wrapper.synthesize_voice_design(
                text=text,
                instruct=instruct,
                language=language,
            )
        else:
            # CustomVoice mode
            result = wrapper.synthesize_custom_voice(
                text=text,
                speaker=speaker,
                language=language,
                instruct=instruct,
            )
    except Exception as e:
        print_error(f"Synthesis failed: {e}")
        sys.exit(1)

    print_success(f"Audio generated ({result.duration:.2f}s)")

    # Save output
    output_path = Path(output)
    if format != "wav" or output_path.suffix != ".wav":
        # Change extension if format differs
        output_path = output_path.with_suffix(f".{format}")

    result.to_file(output_path)
    print_success(f"Saved to {output_path}")


@cli.command()
@click.option("--model", "-m", default="1.7b-custom", help="Model to use")
@click.option("--device", default="cuda:0", help="CUDA device")
def list_speakers(model: str, device: str):
    """List available speakers for CustomVoice model."""
    wrapper = create_model(model=model, device=device)
    speakers = wrapper.get_supported_speakers()

    if console:
        console.print(Panel.fit(
            "\n".join(f"  • [cyan]{s}[/cyan]" for s in speakers),
            title=f"Available Speakers ({len(speakers)})"
        ))
    else:
        print("Available speakers:")
        for s in speakers:
            print(f"  - {s}")


@cli.command()
def list_languages():
    """List supported languages."""
    wrapper = create_model()
    languages = wrapper.get_supported_languages()

    if console:
        console.print(Panel.fit(
            "\n".join(f"  • {lang}" for lang in languages),
            title=f"Supported Languages ({len(languages)})"
        ))
    else:
        print("Supported languages:")
        for lang in languages:
            print(f"  - {lang}")


@cli.command()
@click.option("--model", "-m", default="1.7b-custom", help="Model to use")
@click.option("--device", default="cuda:0", help="CUDA device")
def model_info(model: str, device: str):
    """Show information about a model."""
    wrapper = create_model(model=model, device=device)

    # Determine model type
    model_name = wrapper.config.model_name
    if "CustomVoice" in model_name:
        model_type = "CustomVoice (9 preset speakers)"
    elif "VoiceDesign" in model_name:
        model_type = "VoiceDesign (natural language control)"
    elif "Base" in model_name:
        model_type = "Base (3-second voice cloning)"
    else:
        model_type = "Unknown"

    info = {
        "Model": model_name,
        "Type": model_type,
        "Device": device,
        "Languages": ", ".join(wrapper.get_supported_languages()),
    }

    if "CustomVoice" in model_name:
        info["Speakers"] = ", ".join(wrapper.get_supported_speakers())

    if console:
        console.print(Panel.fit(
            "\n".join(f"  [cyan]{k}:[/cyan] {v}" for k, v in info.items()),
            title="Model Information"
        ))
    else:
        print("Model Information:")
        for k, v in info.items():
            print(f"  {k}: {v}")


@cli.command()
@click.argument("ref_audio", type=click.Path(exists=True))
@click.option("--text", "-t", required=True, help="Text to synthesize")
@click.option("--ref-text", "-r", required=True, help="Reference audio transcript")
@click.option("--output", "-o", default="cloned.wav", help="Output file")
@click.option("--device", default="cuda:0", help="CUDA device")
def clone(ref_audio: str, text: str, ref_text: str, output: str, device: str):
    """Clone a voice from 3-second reference audio.

    Example:
        tts-cli clone reference.wav --ref-text "Reference transcript" --text "New text"
    """
    if console:
        console.print(Panel.fit(
            f"[bold]Voice Cloning[/bold]\n"
            f"Reference: {ref_audio}\n"
            f"Text: {text}",
            title="Qwen3-TTS"
        ))

    print_info("Loading Base model for cloning...")
    wrapper = create_model(model="1.7b-base", device=device)
    wrapper.load()

    print_info("Cloning voice...")
    result = wrapper.synthesize_voice_clone(
        text=text,
        ref_audio=ref_audio,
        ref_text=ref_text,
    )

    result.to_file(output)
    print_success(f"Cloned voice saved to {output}")


@cli.command()
@click.option("--text", "-t", required=True, help="Text to synthesize")
@click.option("--instruct", "-i", required=True, help="Voice description")
@click.option("--output", "-o", default="designed.wav", help="Output file")
@click.option("--language", "-l", default="Auto", help="Target language")
@click.option("--device", default="cuda:0", help="CUDA device")
def design(text: str, instruct: str, output: str, language: str, device: str):
    """Design a voice using natural language description.

    Example:
        tts-cli design "Hello world" --instruct "Energetic young male voice with high pitch"
    """
    if console:
        console.print(Panel.fit(
            f"[bold]Voice Design[/bold]\n"
            f"Instruct: {instruct}\n"
            f"Text: {text}",
            title="Qwen3-TTS"
        ))

    print_info("Loading VoiceDesign model...")
    wrapper = create_model(model="1.7b-design", device=device)
    wrapper.load()

    print_info("Generating voice...")
    result = wrapper.synthesize_voice_design(
        text=text,
        instruct=instruct,
        language=language,
    )

    result.to_file(output)
    print_success(f"Designed voice saved to {output}")


@cli.command()
@click.argument("texts", nargs=-1, required=True)
@click.option("--speaker", "-s", default="Vivian", help="Preset speaker")
@click.option("--output-dir", "-d", default=".", help="Output directory")
@click.option("--device", default="cuda:0", help="CUDA device")
def batch(texts: tuple, speaker: str, output_dir: str, device: str):
    """Synthesize multiple texts in batch.

    Example:
        tts-cli batch "First sentence" "Second sentence" "Third sentence" --speaker Ryan
    """
    if console:
        console.print(Panel.fit(
            f"[bold]Batch Synthesis[/bold]\n"
            f"Count: {len(texts)} texts\n"
            f"Speaker: {speaker}",
            title="Qwen3-TTS"
        ))

    print_info("Loading model...")
    wrapper = create_model(model="1.7b-custom", device=device)
    wrapper.load()

    print_info(f"Synthesizing {len(texts)} texts...")
    results = wrapper.batch_synthesize_custom_voice(
        texts=list(texts),
        speakers=[speaker] * len(texts),
        languages=["Auto"] * len(texts),
    )

    # Save outputs
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    for i, result in enumerate(results):
        filename = output_path / f"output_{i+1:03d}.wav"
        result.to_file(filename)
        print_success(f"Saved {filename}")

    print_success(f"Batch complete: {len(results)} files generated")


# Main entry point
def main():
    """Entry point for tts-cli command."""
    cli()


if __name__ == "__main__":
    main()
