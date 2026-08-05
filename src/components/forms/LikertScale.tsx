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
  min = 1,
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

  const statusId =
    `${generatedId}-status`;

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

  const minimumOption =
    options[0] ??
    min;

  const maximumOption =
    options[
      options.length -
      1
    ] ??
    max;

  const fieldsetClassName = [
    "likert-card",
    "questionnaire-rating-card",

    disabled
      ? "likert-card-disabled questionnaire-rating-card-disabled"
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
    statusId,
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    );

  const optionCountClass =
    options.length >
      0
      ? `questionnaire-rating-options-${options.length}`
      : "";

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
      <legend className="likert-legend questionnaire-rating-title">
        <span className="likert-legend-content">
          <strong
            id={
              titleId
            }
          >
            {title}
          </strong>
        </span>
      </legend>

      <div className="likert-header questionnaire-rating-header">
        {description ? (
          <p
            id={
              descriptionId
            }
            className="likert-description questionnaire-rating-question"
          >
            {description}
          </p>
        ) : (
          <span
            className="likert-description-spacer"
            aria-hidden="true"
          />
        )}

        <output
          id={
            statusId
          }
          className="likert-value questionnaire-rating-value"
          aria-live="polite"
        >
          {selectedValue ===
          null
            ? "Not selected"
            : `${selectedValue} of ${maximumOption}`}
        </output>
      </div>

      <div
        className={[
          "likert-options",
          "questionnaire-rating-options",
          optionCountClass,
        ]
          .filter(
            Boolean,
          )
          .join(
            " ",
          )}
        role="radiogroup"
        aria-label={
          ariaLabel ??
          `${title} rating from ${minimumOption} to ${maximumOption}`
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
                  "questionnaire-rating-option",

                  selected
                    ? "likert-option-selected questionnaire-rating-option-selected"
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
                  className="likert-input questionnaire-rating-input"
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
                  onChange={() => {
                    onChange(
                      option,
                    );
                  }}
                />

                <span
                  className="likert-number questionnaire-rating-number"
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
        className="likert-labels questionnaire-rating-labels"
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
