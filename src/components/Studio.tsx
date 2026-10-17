import { EndCutTool } from "./EndCutTool";
import { MotionSelector } from "./MotionSelector";
import { HipCutTool } from "./HipCutTool";
import { Sparkles } from "lucide-react";
import { Stage } from "./Stage";
import { Controls } from "./Controls";
import { Transport } from "./Transport";
import { PreviewStats } from "./PreviewDetails";
import type { Workbench } from "../motion/useWorkbench";
export function Studio(workbench: Workbench) {
  const {
    mode,
    setMode,
    persona,
    selectPersona,
    options,
    retryPhoto,
    playback,
    onion,
    ground,
    gait,
    setGait,
    palette,
    setPalette,
    skeleton,
    setSkeleton,
    setOnion,
    setGround,
  } = workbench;
  return (
    <div className="studio-layout">
      <div className="preview-panel panel">
        <div className="panel-heading preview-heading">
          <span>
            <span className="purple-square" /> Runner playground
          </span>
          <div className="segmented">
            <button
              data-testid="studio__procedural"
              className={mode === "procedural" ? "active" : ""}
              onClick={() => setMode("procedural")}
            >
              <Sparkles size={13} /> Procedural
            </button>
            <button
              data-testid="studio__original"
              className={mode === "original" ? "active" : ""}
              onClick={() => setMode("original")}
            >
              Original run sheet
            </button>
          </div>
        </div>
        <MotionSelector
          motion={workbench.motion}
          selectMotion={workbench.selectMotion}
        />
        <Stage
          {...options}
          retryPhoto={retryPhoto}
          cycles={playback.cycles}
          mode={mode}
          onion={onion}
          ground={ground}
        />
        <Transport {...workbench} />
        <PreviewStats {...workbench} />
        <div className="audit-export">
          <button
            className="export-button"
            data-testid="studio__audit"
            onClick={workbench.exportAudit}
            disabled={!workbench.canExport}
          >
            Export 16-phase audit · PNG
          </button>
          <p>
            Generated motion on light/dark backgrounds + joint overlays. Uses
            current tuning and cuts, not the source run sheet. Visual review
            aid, not a defect-free certification.
          </p>
        </div>
        {persona === "mei-lin-photo" && mode === "procedural" && (
          <>
            <HipCutTool {...workbench} />
            <EndCutTool {...workbench} />
          </>
        )}
      </div>
      <Controls
        {...{
          persona,
          selectPersona,
          gait,
          setGait,
          palette,
          setPalette,
          skeleton,
          setSkeleton,
          onion,
          setOnion,
          ground,
          setGround,
        }}
      />
    </div>
  );
}
