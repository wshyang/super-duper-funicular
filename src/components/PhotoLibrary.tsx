import { useState } from "react";
import { ArrowUpRight, Camera } from "lucide-react";
import { photoParts } from "../motion/photo/assets";
const sourceUrls = import.meta.glob("../images/photo-runner/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const sources = Object.entries(sourceUrls).map(([path, url]) => ({
  url,
  name: path.split("/").pop()!,
}));
const groups = [
  { id: "body", label: "Body · 4" },
  { id: "near", label: "Near / outer · 6" },
  { id: "far", label: "Far / inner · 6" },
];
export function PhotoLibrary() {
  const [group, setGroup] = useState("body");
  const parts = Object.entries(photoParts).filter(([name]) =>
    group === "body"
      ? !name.startsWith("near-") && !name.startsWith("far-")
      : name.startsWith(group + "-"),
  );
  return (
    <section className="photo-library panel">
      <div className="panel-heading">
        <span>
          <Camera size={16} /> Photographic character kit
        </span>
        <a
          data-testid="photo-assets__manifest"
          href="/photo-runner/manifest.json"
          download
        >
          Rig manifest <ArrowUpRight size={14} />
        </a>
      </div>
      <div className="photo-library-intro">
        <span className="eyebrow">
          MEI LIN / AI-GENERATED PHOTOGRAPHIC ELEMENTS
        </span>
        <h2>Two sides. One articulated runner.</h2>
        <p>
          Nine generated source images, prepared into sixteen transparent parts.
          The far limbs have their own inner surfaces, palm and medial shoe—not
          flipped copies of the near limbs.
        </p>
      </div>
      <div className="palette-tabs">
        {groups.map((item) => (
          <button
            key={item.id}
            data-testid={`photo-assets__${item.id}`}
            className={group === item.id ? "active" : ""}
            onClick={() => setGroup(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="photo-part-grid">
        {parts.map(([name, part]) => (
          <a
            key={name}
            href={part.url}
            download
            data-testid="photo-assets__part"
          >
            <div className="checker">
              <img src={part.url} alt={part.surface} loading="lazy" />
            </div>
            <b>{name.replaceAll("-", " ")}</b>
            <small>{part.surface}</small>
          </a>
        ))}
      </div>
      <details className="photo-sources">
        <summary data-testid="photo-assets__sources">
          Generated source images · 9
        </summary>
        <div className="photo-source-grid">
          {sources.map((source) => (
            <a
              key={source.name}
              href={source.url}
              download
              data-testid="photo-assets__source"
            >
              <img src={source.url} alt={source.name} loading="lazy" />
              <span>{source.name}</span>
            </a>
          ))}
        </div>
      </details>
      <p className="photo-disclaimer">
        Fictional adult Singaporean Chinese character. Synthesized photographic
        imagery, not photographs of a real person. This is a 2D cutout animation
        prototype; joint seams and perspective limits remain. A photographic
        male kit is not included yet.
      </p>
    </section>
  );
}
