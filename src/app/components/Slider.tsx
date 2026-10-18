export interface SliderProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly testId: string;
  readonly format: (value: number) => string;
  readonly onChange: (value: number) => void;
}

export const Slider = (props: SliderProps): React.JSX.Element => {
  const formatted = props.format(props.value);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    props.onChange(Number.parseFloat(event.target.value));
  };
  return (
    <label className="slider">
      <span className="slider__label">
        {props.label}
        <output className="slider__value">{formatted}</output>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={handleChange}
        data-testid={props.testId}
      />
    </label>
  );
};
