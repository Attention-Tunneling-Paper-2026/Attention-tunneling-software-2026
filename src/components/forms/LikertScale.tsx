import {
  useId,
} from "react";

import {
  LIKERT_RATINGS,
} from "../../types/questionnaire";

export interface LikertScaleProps {
  name: string;
  title: string;
  description?: string;

  lowLabel: string;
  highLabel: string;

  value: number | null;

  onChange: (
    value: number,
  ) => void;

  min?: number;
  max?: number;

  required?: boolean;
  disabled?: boolean;

  ariaLabel?: string;
  className?: string;
}

function createLikertOptions(
  min: number,
  max: number,
): number[] {
  if (
    !Number.isInteger(
      min,
    ) ||
    !Number.isInteger(
      max,
    ) ||
    max <
      min
  ) {
    return [];
  }

  return LIKERT_RATINGS.filter(
    (rating) =>
      rating >=
        min &&
      rating <=
        max,
  );
}

export default function LikertScale({
  name,
  title,
  description,
  lowLabel,
  highLabel,
  value,
  onChange,
  min = 0,
  max = 5,
  required = true,
  disabled = false,
  ariaLabel,
  className = "",
}: LikertScaleProps) {
  const generatedId =
    useId();

  const titleId =
    `${generatedId}-title`;

  const descriptionId =
    description
      ? `${generatedId}-description`
      : undefined;

  const labelsId =
    `${generatedId}-labels`;

  const options =
    createLikertOptions(
      min,
      max,
    );

  const selectedValue =
    value !==
      null &&
    options.includes(
      value,
    )
      ? value
      : null;

  const fieldsetClassName = [
    "likert-card",

    disabled
      ? "likert-card-disabled"
      : "",

    className,
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    );

  const describedBy = [
    descriptionId,
    labelsId,
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    );

  const minimumOption =
    options[0] ??
    min;

  const maximumOption =
    options[
      options.length -
      1
    ] ??
    max;

  return (
    <fieldset
      className={
        fieldsetClassName
      }
      disabled={
        disabled
      }
      aria-labelledby={
        titleId
      }
      aria-describedby={
        describedBy
      }
    >
      <legend>
        <span className="likert-legend-content">
          <strong
            id={
              titleId
            }
          >
            {title}
          </strong>

          {description ? (
            <span
              id={
                descriptionId
              }
              className="likert-description"
            >
              {description}
            </span>
          ) : null}
        </span>
      </legend>

      <div
        className="likert-options"
        role="radiogroup"
        aria-label={
          ariaLabel ??
          title
        }
        aria-required={
          required
        }
        data-option-count={
          options.length
        }
      >
        {options.map(
          (
            option,
          ) => {
            const optionId =
              `${generatedId}-${option}`;

            const selected =
              selectedValue ===
              option;

            return (
              <label
                key={
                  option
                }
                htmlFor={
                  optionId
                }
                className={[
                  "likert-option",

                  selected
                    ? "likert-option-selected"
                    : "",
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    " ",
                  )}
              >
                <input
                  id={
                    optionId
                  }
                  className="likert-input"
                  type="radio"
                  name={
                    name
                  }
                  value={
                    option
                  }
                  checked={
                    selected
                  }
                  required={
                    required
                  }
                  disabled={
                    disabled
                  }
                  aria-label={`${title}: ${option} out of ${maximumOption}`}
                  onChange={() =>
                    onChange(
                      option,
                    )
                  }
                />

                <span
                  className="likert-number"
                  aria-hidden="true"
                >
                  {option}
                </span>
              </label>
            );
          },
        )}
      </div>

      <div
        id={
          labelsId
        }
        className="likert-labels"
      >
        <span>
          <strong>
            {minimumOption}
          </strong>

          <small>
            {lowLabel}
          </small>
        </span>

        <span>
          <strong>
            {maximumOption}
          </strong>

          <small>
            {highLabel}
          </small>
        </span>
      </div>
    </fieldset>
  );
}
