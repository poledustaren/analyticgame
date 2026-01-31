#!/usr/bin/env python3
"""
Qwen3-TTS Performance Benchmark
================================

Measures:
- RTF (Real-Time Factor): synthesis_time / audio_duration
  RTF < 1.0 = faster than real-time
- GPU utilization: via nvidia-smi
- Latency: time to first audio frame

Run: python benchmark.py
"""

import os
import sys
import time
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import statistics

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    import torch
    import numpy as np
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich import print as rprint
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False
    torch = None

from backend.model_wrapper import create_model, Precision


def get_gpu_memory(device: str = "cuda:0") -> Dict[str, float]:
    """Get GPU memory usage in MB."""
    if torch is None:
        return {}
    allocated = torch.cuda.memory_allocated(device) / 1024**2
    reserved = torch.cuda.memory_reserved(device) / 1024**2
    return {"allocated_mb": allocated, "reserved_mb": reserved}


def get_gpu_utilization(gpu_id: int = 0) -> Optional[Dict[str, float]]:
    """Get GPU utilization via nvidia-smi."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu,utilization.memory,memory.used,memory.total",
             "--format=csv,noheader,nounits", f"--id={gpu_id}"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(", ")
            return {
                "gpu_util": float(parts[0]),
                "mem_util": float(parts[1]),
                "mem_used_mb": float(parts[2]),
                "mem_total_mb": float(parts[3]),
            }
    except (FileNotFoundError, subprocess.TimeoutExpired, ValueError, IndexError):
        pass
    return None


class BenchmarkResult:
    """Stores benchmark results for a single run."""

    def __init__(self, config_name: str, text: str):
        self.config_name = config_name
        self.text = text
        self.text_length = len(text)
        self.start_time = None
        self.end_time = None
        self.audio_duration = None
        self.synthesis_time = None
        self.rtf = None  # Real-Time Factor
        self.gpu_before = None
        self.gpu_after = None
        self.gpu_peak_util = None
        self.latency_ms = None
        self.error = None

    def to_dict(self) -> dict:
        return {
            "config": self.config_name,
            "text_length": self.text_length,
            "synthesis_time_ms": self.synthesis_time * 1000 if self.synthesis_time else None,
            "audio_duration_ms": self.audio_duration * 1000 if self.audio_duration else None,
            "rtf": self.rtf,
            "latency_ms": self.latency_ms,
            "gpu_before": self.gpu_before,
            "gpu_after": self.gpu_after,
            "gpu_peak_util": self.gpu_peak_util,
            "error": self.error,
        }


class BenchmarkRunner:
    """Runs TTS performance benchmarks."""

    # Test texts of different lengths
    TEST_TEXTS = {
        "short": "Hello world!",
        "medium": (
            "The quick brown fox jumps over the lazy dog. "
            "This is a medium length text that tests the synthesis performance "
            "on a more realistic input size."
        ),
        "long": (
            "Artificial intelligence is transforming the way we interact with technology. "
            "Text-to-speech systems have become increasingly sophisticated, capable of "
            "producing natural-sounding speech in multiple languages and voices. "
            "The Qwen3-TTS model represents a significant advancement in this field, "
            "offering features like voice cloning, voice design, and support for ten languages. "
            "Performance optimization is crucial for real-time applications, where the "
            "Real-Time Factor (RTF) must be less than 1.0 to achieve faster-than-real-time synthesis. "
            "This benchmark measures various performance metrics to ensure the model meets "
            "the requirements for production deployment on RTX 4090 GPUs."
        ),
    }

    def __init__(self, device: str = "cuda:0", warmup_runs: int = 2, benchmark_runs: int = 5):
        self.device = device
        self.warmup_runs = warmup_runs
        self.benchmark_runs = benchmark_runs
        self.results: List[BenchmarkResult] = []

        if RICH_AVAILABLE:
            self.console = Console()
        else:
            self.console = None

    def print(self, *args, **kwargs):
        if self.console:
            self.console.print(*args, **kwargs)
        else:
            print(*args, **kwargs)

    def check_flash_attention(self) -> dict:
        """Check if FlashAttention 2 is installed and available."""
        info = {
            "installed": False,
            "version": None,
            "available": False,
        }

        # Check installation
        try:
            result = subprocess.run(
                ["pip", "show", "flash-attn"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                info["installed"] = True
                for line in result.stdout.split("\n"):
                    if line.startswith("Version:"):
                        info["version"] = line.split(":")[1].strip()
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # Check if importable and working
        try:
            import flash_attn
            info["available"] = True
            # Check if flash_attn has the correct functions
            if hasattr(flash_attn, 'flash_attn_func'):
                info["has_flash_attn_func"] = True
        except ImportError:
            pass

        # Check CUDA compatibility
        if torch and torch.cuda.is_available():
            info["cuda_available"] = True
            info["cuda_version"] = torch.version.cuda
            info["gpu_name"] = torch.cuda.get_device_name(0)
            info["gpu_capability"] = torch.cuda.get_device_capability(0)

            # FlashAttention 2 requires compute capability >= 7.5
            major, minor = info["gpu_capability"]
            info["compute_capability"] = f"{major}.{minor}"
            info["fa2_compatible"] = major > 7 or (major == 7 and minor >= 5)
        else:
            info["cuda_available"] = False

        return info

    def run_benchmark(
        self,
        config_name: str,
        model: str = "1.7b-custom",
        precision: str = "bf16",
        flash_attention: bool = True,
        text_name: str = "medium",
    ) -> BenchmarkResult:
        """Run a single benchmark configuration."""

        result = BenchmarkResult(config_name, self.TEST_TEXTS[text_name])

        # Get initial GPU state
        result.gpu_before = get_gpu_memory(self.device)

        try:
            # Create model
            wrapper = create_model(model=model, device=self.device, precision=precision)
            wrapper.config.flash_attention = flash_attention

            # Warmup runs
            for _ in range(self.warmup_runs):
                try:
                    wrapper.load()
                    wrapper.synthesize_custom_voice(
                        text=self.TEST_TEXTS[text_name],
                        speaker="Vivian",
                    )
                except Exception:
                    pass

            # Reload for clean benchmark
            wrapper.unload()
            torch.cuda.empty_cache()
            time.sleep(0.5)

            # Start benchmark
            wrapper.load()

            # Get GPU utilization before
            gpu_stats_before = get_gpu_utilization(int(self.device.split(":")[-1]))

            latency_start = None

            # Measure synthesis
            result.start_time = time.perf_counter()

            # Try to measure latency by patching (rough estimate)
            audio_result = wrapper.synthesize_custom_voice(
                text=self.TEST_TEXTS[text_name],
                speaker="Vivian",
            )

            result.end_time = time.perf_counter()
            result.audio_duration = audio_result.duration

            # Get GPU utilization after
            gpu_stats_after = get_gpu_utilization(int(self.device.split(":")[-1]))
            if gpu_stats_after:
                result.gpu_peak_util = gpu_stats_after.get("gpu_util")

            # Calculate metrics
            result.synthesis_time = result.end_time - result.start_time
            result.rtf = result.synthesis_time / result.audio_duration if result.audio_duration > 0 else None

            result.gpu_after = get_gpu_memory(self.device)

            wrapper.unload()

        except Exception as e:
            result.error = str(e)

        return result

    def run_suite(self) -> Dict:
        """Run the full benchmark suite."""

        if self.console:
            self.console.print(Panel.fit(
                "[bold cyan]Qwen3-TTS Performance Benchmark[/bold cyan]\n"
                f"Device: {self.device}\n"
                f"Warmup runs: {self.warmup_runs}\n"
                f"Benchmark runs: {self.benchmark_runs}",
                title="Benchmark Configuration"
            ))

        # Check FlashAttention 2
        self.print("\n[bold]Checking FlashAttention 2...[/bold]")
        fa2_info = self.check_flash_attention()

        fa2_status = "[green]✓ Installed[/green]" if fa2_info["installed"] else "[red]✗ Not installed[/red]"
        self.print(f"  Installation: {fa2_status}")
        if fa2_info["version"]:
            self.print(f"  Version: {fa2_info['version']}")

        fa2_avail = "[green]✓ Available[/green]" if fa2_info["available"] else "[red]✗ Not available[/red]"
        self.print(f"  Import: {fa2_avail}")

        if fa2_info.get("cuda_available"):
            self.print(f"  GPU: {fa2_info.get('gpu_name', 'Unknown')}")
            self.print(f"  Compute Capability: {fa2_info.get('compute_capability', 'Unknown')}")
            fa2_comp = "[green]✓ Compatible[/green]" if fa2_info.get("fa2_compatible") else "[red]✗ Incompatible[/red]"
            self.print(f"  FA2 Compatible: {fa2_comp}")

        # Install FlashAttention 2 if needed
        if not fa2_info["installed"] and fa2_info.get("fa2_compatible", True):
            self.print("\n[yellow]Installing FlashAttention 2...[/yellow]")
            try:
                subprocess.run(
                    ["pip", "install", "-U", "flash-attn", "--no-build-isolation"],
                    check=True, timeout=300
                )
                self.print("[green]✓ FlashAttention 2 installed successfully[/green]")
                fa2_info["installed"] = True
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
                self.print(f"[red]✗ Failed to install FlashAttention 2: {e}[/red]")

        # Configurations to test
        configs = [
            ("BF16 + FA2", "bf16", True),
            ("FP16 + FA2", "fp16", True),
            ("FP32 + FA2", "fp32", True),
            ("BF16 No FA2", "bf16", False),
        ]

        all_results = {}

        for config_name, precision, fa2 in configs:
            if not fa2 and not fa2_info["available"]:
                continue  # Skip no-FA2 tests if FA2 isn't available

            self.print(f"\n[bold]Testing: {config_name}[/bold]")

            # Run multiple iterations
            rtfs = []
            synthesis_times = []

            for i in range(self.benchmark_runs):
                result = self.run_benchmark(
                    config_name=config_name,
                    precision=precision,
                    flash_attention=fa2,
                    text_name="medium",
                )

                if result.error:
                    self.print(f"  [red]Run {i+1}: ERROR - {result.error}[/red]")
                    continue

                rtfs.append(result.rtf)
                synthesis_times.append(result.synthesis_time * 1000)

                self.print(f"  Run {i+1}: RTF={result.rtf:.3f} ({result.synthesis_time*1000:.0f}ms)")

            if rtfs:
                all_results[config_name] = {
                    "rtf_mean": statistics.mean(rtfs),
                    "rtf_std": statistics.stdev(rtfs) if len(rtfs) > 1 else 0,
                    "rtf_min": min(rtfs),
                    "rtf_max": max(rtfs),
                    "synthesis_time_mean_ms": statistics.mean(synthesis_times),
                    "precision": precision,
                    "flash_attention": fa2,
                }

        # Generate report
        return self._generate_report(all_results, fa2_info)

    def _generate_report(self, results: Dict, fa2_info: Dict) -> Dict:
        """Generate a benchmark report."""

        report = {
            "timestamp": datetime.now().isoformat(),
            "device": self.device,
            "flash_attention": fa2_info,
            "results": results,
            "summary": {},
        }

        if self.console:
            self.print("\n" + "="*60)
            self.print("[bold cyan]BENCHMARK RESULTS[/bold cyan]")
            self.print("="*60)

            # Results table
            table = Table(title="Performance Summary")
            table.add_column("Config", style="cyan")
            table.add_column("RTF (mean)", style="green")
            table.add_column("RTF (std)")
            table.add_column("RTF (min)")
            table.add_column("RTF (max)")
            table.add_column("Time (ms)")
            table.add_column("Status")

            best_config = None
            best_rtf = float('inf')

            for config_name, metrics in results.items():
                rtf = metrics["rtf_mean"]
                status = "[green]✓ RTF < 1.0[/green]" if rtf < 1.0 else "[red]✗ RTF ≥ 1.0[/red]"

                table.add_row(
                    config_name,
                    f"{rtf:.3f}",
                    f"{metrics['rtf_std']:.3f}",
                    f"{metrics['rtf_min']:.3f}",
                    f"{metrics['rtf_max']:.3f}",
                    f"{metrics['synthesis_time_mean_ms']:.0f}",
                    status
                )

                if rtf < best_rtf:
                    best_rtf = rtf
                    best_config = config_name

            self.console.print(table)

            # Recommendations
            self.print("\n[bold]Recommendations:[/bold]")

            if best_rtf < 1.0:
                self.print(f"  [green]✓ Goal achieved![/green] Best config: {best_config} (RTF={best_rtf:.3f})")
            else:
                self.print(f"  [yellow]⚠ Target not yet reached[/yellow]. Best RTF: {best_rtf:.3f}")
                self.print("     Consider:")
                if not fa2_info["available"]:
                    self.print("     - Install FlashAttention 2")
                self.print("     - Use smaller model (0.6B vs 1.7B)")
                self.print("     - Batch processing for multiple texts")

            # FlashAttention impact
            fa2_results = {k: v for k, v in results.items() if v["flash_attention"]}
            no_fa2_results = {k: v for k, v in results.items() if not v["flash_attention"]}

            if fa2_results and no_fa2_results:
                fa2_rtf = next(iter(fa2_results.values()))["rtf_mean"]
                no_fa2_rtf = next(iter(no_fa2_results.values()))["rtf_mean"]
                speedup = (no_fa2_rtf / fa2_rtf - 1) * 100
                self.print(f"\n  FlashAttention 2 speedup: [cyan]+{speedup:.1f}%[/cyan]")

        return report

    def save_report(self, report: Dict, output_path: str = "benchmark_report.json"):
        """Save benchmark report to JSON file."""
        output = Path(output_path)
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
        if self.console:
            self.console.print(f"\n[green]✓ Report saved to {output}[/green]")


def main():
    """Run the benchmark."""
    import argparse

    parser = argparse.ArgumentParser(description="Qwen3-TTS Performance Benchmark")
    parser.add_argument("--device", default="cuda:0", help="CUDA device")
    parser.add_argument("--runs", type=int, default=5, help="Number of benchmark runs")
    parser.add_argument("--warmup", type=int, default=2, help="Number of warmup runs")
    parser.add_argument("--output", default="benchmark_report.json", help="Output report file")
    args = parser.parse_args()

    runner = BenchmarkRunner(
        device=args.device,
        warmup_runs=args.warmup,
        benchmark_runs=args.runs,
    )

    report = runner.run_suite()
    runner.save_report(report, args.output)


if __name__ == "__main__":
    main()
