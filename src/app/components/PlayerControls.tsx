import type { AnimationPlayback } from '../hooks/useAnimationPlayback';

interface PlayerControlsProps {
  readonly playback: AnimationPlayback;
}

export function PlayerControls({ playback }: PlayerControlsProps) {
  const currentFrame = playback.frames[playback.currentFrameIndex];
  return (
    <div className="player__controls">
      <button type="button" data-testid="player__play-toggle" onClick={playback.togglePlay}>
        {playback.isPlaying ? 'Pause' : 'Play'}
      </button>
      <button type="button" data-testid="player__step-back" onClick={() => playback.stepTo(playback.currentFrameIndex - 1)}>
        ◀
      </button>
      <span data-testid="player__frame-label">
        frame {currentFrame?.index ?? 0}/16 · φ {(currentFrame?.phase ?? 0).toFixed(4)}
      </span>
      <button type="button" data-testid="player__step-forward" onClick={() => playback.stepTo(playback.currentFrameIndex + 1)}>
        ▶
      </button>
      <label>
        fps
        <input
          type="range"
          min={4}
          max={30}
          value={playback.framesPerSecond}
          data-testid="player__fps"
          onChange={(event) => playback.setFramesPerSecond(Number(event.target.value))}
        />
        <span data-testid="player__fps-label">{playback.framesPerSecond}</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={playback.isOnionSkinEnabled}
          data-testid="player__onion"
          onChange={playback.toggleOnionSkin}
        />
        onion skin
      </label>
    </div>
  );
}
