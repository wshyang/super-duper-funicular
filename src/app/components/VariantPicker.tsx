import type { RunnerVariant } from "../../runner/palette.ts";

export interface VariantPickerProps {
  readonly variants: readonly RunnerVariant[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
}

export function VariantPicker({ variants, selectedId, onSelect }: VariantPickerProps) {
  return (
    <div className="variant-picker" role="radiogroup" aria-label="Colour variant">
      {variants.map((variant) => (
        <button
          key={variant.id}
          type="button"
          role="radio"
          aria-checked={variant.id === selectedId}
          data-testid={`variant-picker__option-${variant.id}`}
          className={variant.id === selectedId ? "variant-picker__option variant-picker__option--selected" : "variant-picker__option"}
          onClick={() => onSelect(variant.id)}
        >
          {variant.label}
        </button>
      ))}
    </div>
  );
}
