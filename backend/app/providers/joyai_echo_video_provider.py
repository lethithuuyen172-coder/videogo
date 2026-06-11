"""JoyAI-Echo local video provider."""

import asyncio
import json
import shutil
from pathlib import Path
from uuid import uuid4

from app.config import get_settings
from app.core.exceptions import AppError, ProviderError
from app.core.provider_base import BaseVideoProvider, ProviderModel, ProviderResult, VideoGenParams


class JoyAIEchoVideoProvider(BaseVideoProvider):
    """Run JoyAI-Echo inference as an optional local subprocess."""

    provider_key = "joyai_echo"
    model_id = "joyai-echo-longvideo"

    def get_model_list(self) -> list[ProviderModel]:
        return [
            ProviderModel(
                model_id=self.model_id,
                provider=self.provider_key,
                name="JoyAI-Echo LongVideo",
                modality="video",
                status="configured" if self._is_configured() else "coming_soon",
                credit_cost=300,
            )
        ]

    async def generate_video(self, model_id: str, params: VideoGenParams) -> ProviderResult:
        settings = get_settings()
        repo_path = Path(settings.joyai_echo_repo_path).expanduser().resolve() if settings.joyai_echo_repo_path else None
        checkpoint = Path(settings.joyai_echo_checkpoint).expanduser().resolve() if settings.joyai_echo_checkpoint else None
        gemma_path = Path(settings.joyai_echo_gemma_path).expanduser().resolve() if settings.joyai_echo_gemma_path else None
        if not repo_path or not checkpoint or not gemma_path:
            raise AppError("E101", "请先配置 JOYAI_ECHO_REPO_PATH、JOYAI_ECHO_CHECKPOINT、JOYAI_ECHO_GEMMA_PATH", 400)
        if not (repo_path / "inference.py").exists():
            raise AppError("E101", f"JoyAI-Echo 仓库路径无效: {repo_path}", 400)
        if not checkpoint.exists():
            raise AppError("E101", f"JoyAI-Echo checkpoint 不存在: {checkpoint}", 400)
        if not gemma_path.exists():
            raise AppError("E101", f"JoyAI-Echo Gemma 路径不存在: {gemma_path}", 400)

        run_id = uuid4().hex
        work_dir = params.output_dir / "joyai_echo" / run_id
        prompts_dir = work_dir / "prompts"
        output_root = work_dir / "result"
        prompts_dir.mkdir(parents=True, exist_ok=True)
        prompt_name = f"{run_id}.json"
        (prompts_dir / prompt_name).write_text(
            json.dumps({"prompts": self._prompt_list(params.prompt)}, ensure_ascii=False),
            encoding="utf-8",
        )
        config_path = work_dir / "inference.yaml"
        config_path.write_text(
            self._config_yaml(checkpoint, gemma_path, prompts_dir, output_root, params),
            encoding="utf-8",
        )

        command = [
            settings.joyai_echo_python,
            "inference.py",
            "--config",
            str(config_path),
            "--prompts-dir",
            str(prompts_dir),
            "--prompts-glob",
            prompt_name,
            "--output-root",
            str(output_root),
        ]
        process = await asyncio.create_subprocess_exec(
            *command,
            cwd=str(repo_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=settings.joyai_echo_timeout_seconds)
        except TimeoutError as exc:
            process.kill()
            await process.communicate()
            raise ProviderError("E203", "JoyAI-Echo 推理超时", 504) from exc
        if process.returncode != 0:
            detail = (stderr or stdout).decode(errors="ignore")[-1000:]
            raise ProviderError("E200", f"JoyAI-Echo 推理失败: {detail}")

        combined = self._find_combined_video(output_root)
        if combined is None:
            raise ProviderError("E200", f"JoyAI-Echo 未生成 combined_shots.mp4: {output_root}")
        params.output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{run_id}.mp4"
        final_path = params.output_dir / filename
        shutil.copyfile(combined, final_path)
        return ProviderResult(
            provider=self.provider_key,
            model_id=model_id,
            url=f"{settings.public_base_url}/storage/generated/{filename}",
            storage_key=f"generated/{filename}",
            metadata={
                "source": str(combined),
                "duration": params.duration_seconds,
                "aspect_ratio": params.aspect_ratio,
                "resolution": params.resolution,
            },
        )

    def estimate_cost(self, model_id: str, duration_seconds: int) -> int:
        return max(300, duration_seconds * 20)

    @staticmethod
    def _is_configured() -> bool:
        settings = get_settings()
        if not (settings.joyai_echo_repo_path and settings.joyai_echo_checkpoint and settings.joyai_echo_gemma_path):
            return False
        repo_path = Path(settings.joyai_echo_repo_path).expanduser()
        checkpoint = Path(settings.joyai_echo_checkpoint).expanduser()
        gemma_path = Path(settings.joyai_echo_gemma_path).expanduser()
        return (repo_path / "inference.py").exists() and checkpoint.exists() and gemma_path.exists()

    @staticmethod
    def _config_yaml(
        checkpoint: Path,
        gemma_path: Path,
        prompts_dir: Path,
        output_root: Path,
        params: VideoGenParams,
    ) -> str:
        width, height = JoyAIEchoVideoProvider._size(params.aspect_ratio, params.resolution)
        frames = max(25, params.duration_seconds * 25 + 1)
        return f"""env:
  venv_path: .venv
paths:
  checkpoint: "{checkpoint.as_posix()}"
  gemma_path: "{gemma_path.as_posix()}"
  prompts_dir: "{prompts_dir.as_posix()}"
  prompts_glob: "*.json"
  output_root: "{output_root.as_posix()}"
video:
  num_frames: {frames}
  height: {height}
  width: {width}
  fps: 25
  seed: 12345
denoising:
  steps: [1000, 994, 988, 981, 975, 909, 725, 422, 0]
  sigmas: [1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0]
memory:
  max_size: 7
  num_fix_frames: 3
  downscale_factor: 1
  position_mode: reference
  lora_strength: 1.0
  lora_generator: true
  lora_path: ""
  save_mode: random_every_shot_frame
  frame_selection_mode: center
  clip_num_frames: 9
audio_memory:
  enable: true
  window_size: 96
  window_selection_mode: max_response
  sample_rate: 16000
  mel_bins: 128
  mel_hop_length: 160
  n_fft: 1024
  downsample_factor: 4
  is_causal: true
inference:
  device: cuda
  dtype: bfloat16
  v2a_grad_scale: 2.0
"""

    @staticmethod
    def _size(aspect_ratio: str, resolution: str) -> tuple[int, int]:
        if resolution == "1080p":
            return (1920, 1080) if aspect_ratio == "16:9" else (1080, 1920) if aspect_ratio == "9:16" else (1080, 1080)
        return (1280, 736) if aspect_ratio == "16:9" else (736, 1280) if aspect_ratio == "9:16" else (736, 736)

    @staticmethod
    def _prompt_list(prompt: str) -> list[str]:
        try:
            payload = json.loads(prompt)
        except json.JSONDecodeError:
            return [prompt]
        if not isinstance(payload, dict) or not isinstance(payload.get("prompts"), list):
            return [prompt]
        prompts = [item.strip() for item in payload["prompts"] if isinstance(item, str) and item.strip()]
        return prompts or [prompt]

    @staticmethod
    def _find_combined_video(output_root: Path) -> Path | None:
        matches = sorted(output_root.rglob("combined_shots.mp4"), key=lambda item: item.stat().st_mtime, reverse=True)
        return matches[0] if matches else None
