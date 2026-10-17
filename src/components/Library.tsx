import { PhotoLibrary } from "./PhotoLibrary";
import { useState } from "react";
import { ArrowUpRight, Check, FileImage } from "lucide-react";
import manifest from "../../public/sprites/manifest.json";
import original from "../images/runner-six-palette-eight-frame-sheet.jpeg";
export function Library() {
  const [palette, setPalette] = useState(0);
  const names = [
    "Crimson",
    "Cobalt",
    "Leaf",
    "Sunshine",
    "Violet",
    "Tangerine",
  ];
  const frames = manifest.frames.filter((frame) => frame.row === palette);
  return (
    <div className="library">
      <PhotoLibrary />
      <div className="library-summary">
        <div>
          <span className="eyebrow">ARTWORK AUDIT</span>
          <h2>A clean starting line.</h2>
          <p>One original sheet. Six palettes. Every piece accounted for.</p>
        </div>
        <div className="audit-count">
          <b>48</b>
          <span>transparent sprites</span>
        </div>
        <div className="audit-count">
          <b>0</b>
          <span>exact duplicates</span>
        </div>
      </div>
      <div className="library-grid">
        <section className="panel source-panel">
          <div className="panel-heading">
            <span>
              <FileImage size={16} /> Original artwork
            </span>
            <span className="tiny-tag">JPEG</span>
          </div>
          <a
            href={original}
            target="_blank"
            rel="noreferrer"
            data-testid="assets__source"
          >
            <img
              src={original}
              alt="Original six-palette eight-frame runner sheet on magenta"
            />
          </a>
          <div className="source-info">
            <b>Runner · six-palette animation sheet</b>
            <p>2,528 × 1,696 px · Character animation</p>
            <span>
              <Check size={14} /> Original bytes preserved
            </span>
          </div>
        </section>
        <section className="panel extracted-panel">
          <div className="panel-heading">
            <span>Extracted sprites</span>
            <a
              href="/sprites/manifest.json"
              download
              data-testid="assets__manifest"
            >
              Manifest <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="palette-tabs">
            {names.map((name, index) => (
              <button
                key={name}
                data-testid="assets__palette"
                className={palette === index ? "active" : ""}
                onClick={() => setPalette(index)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="asset-cells">
            {frames.map((frame) => (
              <a
                key={frame.id}
                href={frame.url}
                download
                data-testid="assets__download"
                title={`Download ${frame.id}`}
              >
                <div className="checker">
                  <img src={frame.url} alt={frame.id} />
                </div>
                <span>
                  FRAME 0{frame.column + 1} <ArrowUpRight size={13} />
                </span>
              </a>
            ))}
          </div>
          <p className="asset-footnote">
            RGBA PNG · shared canvas & pivot · click a frame to download
          </p>
        </section>
      </div>
      <div className="info-banner">
        <Check size={18} />
        <p>
          <b>Exact deduplication, not destructive guesswork.</b> All 48
          extracted images have unique pixel hashes. Similar poses are preserved
          for analysis. No backdrop artwork was present in this checkout.
        </p>
      </div>
    </div>
  );
}
export function Notes() {
  return (
    <div className="notes">
      <div className="notes-title">
        <span className="eyebrow">MOTION STUDY / 001</span>
        <h2>More frames ≠ better motion.</h2>
        <p>
          The source has eight columns, but the body never quite completes a
          run.
          <br />
          Here’s what changes when we animate the anatomy instead.
        </p>
      </div>
      <div className="note-cards">
        <article className="panel">
          <span className="note-number">01 / THE SOURCE</span>
          <h3>A half-cycle, repeated.</h3>
          <p>
            Columns 5–8 visually repeat the silhouettes of 1–4. The near leg
            stays the leading leg instead of exchanging roles with the far leg.
            Unique pixels do not necessarily mean unique motion.
          </p>
          <div className="mini-sequence">
            1 → 2 → 3 → 4 <span>↻</span>
            <br />1 → 2 → 3 → 4
          </div>
        </article>
        <article className="panel">
          <span className="note-number">02 / THE SYMPTOMS</span>
          <h3>A hop, rather than a run.</h3>
          <p>
            The repeated lead leg, abrupt pose changes, and changing head and
            shoe shapes create a stuttering loop. Without a shared contact
            model, the feet also lack a convincing planted interval.
          </p>
          <div className="note-chips">
            <span>Repeated lead leg</span>
            <span>Shape drift</span>
            <span>Uneven spacing</span>
          </div>
        </article>
        <article className="panel">
          <span className="note-number">03 / THE REPLACEMENT</span>
          <h3>One body. A continuous cycle.</h3>
          <p>
            Two legs run half a cycle apart. Each foot lands midfoot, rolls onto
            its toes, and recovers in the air. Fixed-length bones solve the
            knees; opposed arms balance the stride. Every intermediate pose is
            calculated.
          </p>
          <div className="note-chips green">
            <span>Alternating support</span>
            <span>Flight phase</span>
            <span>Stable proportions</span>
          </div>
        </article>
      </div>
      <section className="method panel">
        <span className="eyebrow">THE MOTION RECIPE</span>
        <h3>Phase → foot path → joint solution → sprite</h3>
        <div className="method-steps">
          <p>
            <b>01. Set the rhythm</b>Cadence advances a normalized cycle. The
            far leg starts at phase + 0.5.
          </p>
          <p>
            <b>02. Plant and recover</b>36% stance, 64% swing. Less than 50%
            stance creates two flight intervals.
          </p>
          <p>
            <b>03. Solve the body</b>Two-bone inverse kinematics finds the knees
            from the rolling ankle. Hips lead forward; an articulated neck keeps
            the head steady.
          </p>
          <p>
            <b>04. Draw at any time</b>Layer articulated shapes at pixel
            resolution. No baked frames or model calls needed.
          </p>
        </div>
      </section>
      <p className="notes-caveat">
        A stylized side-view kinematic rig, not a physics simulation. The new
        character is procedurally drawn; it is not a reconstruction of hidden
        parts from the original sheet.
      </p>
    </div>
  );
}
