import { motionList, motions, type MotionType } from "../motion/motions";
interface Props {
  motion: MotionType;
  selectMotion: (motion: MotionType) => void;
}
export function MotionSelector({ motion, selectMotion }: Props) {
  const description = motions[motion].description;
  return (
    <section className="motion-selector" aria-label="Motion type">
      <div className="motion-options" role="group" aria-label="Choose a motion">
        {motionList.map((profile) => (
          <button
            key={profile.id}
            data-testid={`motion__${profile.id}`}
            aria-pressed={motion === profile.id}
            onClick={() => selectMotion(profile.id)}
          >
            {profile.name}
          </button>
        ))}
      </div>
      <p>
        {description}
        <span>Settings saved per motion this session</span>
      </p>
    </section>
  );
}
