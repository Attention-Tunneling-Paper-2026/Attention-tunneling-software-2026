import { useId } from "react";

interface LikertScaleProps {
  name: string;
  title: string;
  description?: string;

  lowLabel: string;
  highLabel: string;

  value: number | null;

  onChange: (value: number) => void;

  min?: number;
  max?: number;

  required?: boolean;
  disabled?: boolean;

  ariaLabel?: string;
  className?: string;
}

export default function LikertScale({
  name,
  title,
  description,
  lowLabel,
  highLabel,
  value,
  onChange,
  min = 1,
  max = 7,
  required = true,
  disabled = false,
  ariaLabel,
  className = "",
}: LikertScaleProps) {
  const generatedId = useId();

  const descriptionId = description
    ? `${generatedId}-description`
    : undefined;

  const options = Array.from(
    {
      length: max - min + 1,
    },
    (_, index) => min + index,
  );

  const fieldsetClassName = [
    "likert-card",
    disabled
      ? "likert-card-disabled"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      className={fieldsetClassName}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={descriptionId}
    >
      <legend>
        <strong>{title}</strong>

        {description ? (
          <span id={descriptionId}>
            {description}
          </span>
        ) : null}
      </legend>

      <div
        className="likert-options"
        role="radiogroup"
        aria-label={ariaLabel ?? title}
      >
        {options.map((option) => {
          const optionId =
            `${generatedId}-${option}`;

          const selected =
            value === option;

          return (
            <label
              key={option}
              htmlFor={optionId}
              className={[
                "likert-option",
                selected
                  ? "likert-option-selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option}
                checked={selected}
                required={required}
                disabled={disabled}
                onChange={() =>
                  onChange(option)
                }
              />

              <span aria-hidden="true">
                {option}
              </span>

              <span className="sr-only">
                Rating {option} of {max}
              </span>
            </label>
          );
        })}
      </div>

      <div className="likert-labels">
        <span>
          <strong>{min}</strong>
          <small>{lowLabel}</small>
        </span>

        <span>
          <strong>{max}</strong>
          <small>{highLabel}</small>
        </span>
      </div>
    </fieldset>
  );
}