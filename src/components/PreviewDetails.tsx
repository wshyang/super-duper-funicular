import { motions } from "../motion/motions";
import { personas } from "../motion/personas";
import { Activity, Code2, Footprints, ArrowUpRight, Zap } from "lucide-react";
import type { Workbench } from "../motion/useWorkbench";
export function PreviewStats({
  frequency,
  mode,
  phasePercent,
  persona,
  motion,
}: Workbench) {
  const gaitName = mode === "original" ? "Source run" : motions[motion].name;
  const isPhoto = personas[persona].renderStyle === "photo";
  return (
    <>
      <div className="preview-stats">
        <div>
          <span className="stat-icon">
            <Activity size={17} />
          </span>
          <span>
            <small>CYCLE FREQUENCY</small>
            <b>
              {frequency} <em>Hz</em>
            </b>
          </span>
        </div>
        <div>
          <span className="stat-icon">
            <Footprints size={17} />
          </span>
          <span>
            <small>GAIT TYPE</small>
            <b>{gaitName}</b>
          </span>
        </div>
        <div>
          <span className="stat-icon">
            <Code2 size={17} />
          </span>
          <span>
            <small>RENDER METHOD</small>
            <b>
              {mode === "procedural"
                ? isPhoto
                  ? "Photographic cutouts"
                  : "Articulated rig"
                : "Source frames"}
            </b>
          </span>
        </div>
      </div>
      <div className="preview-caption">
        <span className="caption-dot" />
        <span>
          {mode === "procedural"
            ? isPhoto
              ? "AI-generated photographic elements · 2D articulated prototype"
              : "Real-time motion. No frame swapping. Just a little math."
            : "Original eight-frame sequence. Look for the repeated leading leg."}
        </span>
        <span>{phasePercent}%</span>
      </div>
    </>
  );
}
export function Insight({ setTab }: { setTab: (value: string) => void }) {
  return (
    <div className="insight-banner">
      <span className="insight-icon">
        <Zap size={20} />
      </span>
      <div>
        <b>The difference is in the stride.</b>
        <p>
          The original sheet repeats a half-cycle. Our rig gives each leg its
          own turn.
        </p>
      </div>
      <button data-testid="studio__read-notes" onClick={() => setTab("notes")}>
        Explore the motion notes <ArrowUpRight size={16} />
      </button>
    </div>
  );
}
