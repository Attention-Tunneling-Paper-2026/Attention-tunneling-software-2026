import {
  useId,
} from "react";

import {
  NASA_TLX_RATINGS,
  isNasaTlxValue,
} from "../../types/questionnaire";

import type {
  NasaTlxDimension,
  NasaTlxRating,
  NasaTlxRatings,
} from "../../types/questionnaire";

export type {
  NasaTlxDimension,
  NasaTlxRating,
} from "../../types/questionnaire";

export type NasaTlxValues =
  NasaTlxRatings;

interface NasaTlxFormProps {
  values: NasaTlxValues;

  onChange: (
    dimension: NasaTlxDimension,
    value: Exclude<
      NasaTlxRating,
      null
    >,
  ) => void;

  disabled?: boolean;
  className?: string;
}

interface NasaTlxScale {
  dimension: NasaTlxDimension;
  title: string;
  question: string;
  lowLabel: string;
  highLabel: string;
}

const nasaTlxScales:
  NasaTlxScale[] = [
    {
      dimension:
        "mentalDemand",

      title:
        "Mental demand",

      question:
        "How mentally demanding was the task?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },

    {
      dimension:
        "physicalDemand",

      title:
        "Physical demand",

      question:
        "How physically demanding was the task?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },

    {
      dimension:
        "temporalDemand",

      title:
        "Temporal demand",

      question:
        "How hurried or rushed did you feel while completing the task?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },

    {
      dimension:
        "performance",

      title:
        "Performance",

      question:
        "How unsuccessful do you think you were in accomplishing the task?",

      lowLabel:
        "Perfect",

      highLabel:
        "Failure",
    },

    {
      dimension:
        "effort",

      title:
        "Effort",

      question:
        "How hard did you have to work to accomplish your level of performance?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },

    {
      dimension:
        "frustration",

      title:
        "Frustration",

      question:
        "How insecure, discouraged, irritated, stressed, or annoyed did you feel?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },
  ];

function normalizeRating(
  value: NasaTlxRating,
): NasaTlxRating {
  return isNasaTlxValue(
    value,
  )
    ? value
    : null;
}

export function createDefaultNasaTlxValues():
  NasaTlxValues {
  return {
    mentalDemand:
      null,

    physicalDemand:
      null,

    temporalDemand:
      null,

    performance:
      null,

    effort:
      null,

    frustration:
      null,
  };
}

export function isNasaTlxComplete(
  values: NasaTlxValues,
): boolean {
  return Object.values(
    values,
  ).every(
    isNasaTlxValue,
  );
}

export default function NasaTlxForm({
  values,
  onChange,
  disabled = false,
  className = "",
}: NasaTlxFormProps) {
  const generatedId =
    useId();

  const formClassName = [
    "nasa-tlx-form",

    disabled
      ? "nasa-tlx-form-disabled"
      : "",

    className,
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    );

  return (
    <fieldset
      className={
        formClassName
      }
      disabled={
        disabled
      }
    >
      <legend className="sr-only">
        NASA Task Load Index ratings
      </legend>

      <div className="nasa-scale-list">
        {nasaTlxScales.map(
          ({
            dimension,
            title,
            question,
            lowLabel,
            highLabel,
          }) => {
            const groupId =
              `${generatedId}-${dimension}`;

            const questionId =
              `${groupId}-question`;

            const labelsId =
              `${groupId}-labels`;

            const selectedValue =
              normalizeRating(
                values[
                  dimension
                ],
              );

            return (
              <fieldset
                key={
                  dimension
                }
                className="nasa-scale-card"
                aria-describedby={`${questionId} ${labelsId}`}
              >
                <legend className="nasa-scale-title">
                  {title}
                </legend>

                <div className="nasa-scale-header">
                  <p
                    id={
                      questionId
                    }
                  >
                    {question}
                  </p>

                  <output
                    className="nasa-scale-value"
                    aria-live="polite"
                  >
                    {selectedValue ===
                    null
                      ? "Not selected"
                      : `${selectedValue}`}
                  </output>
                </div>

                <div
                  className="nasa-likert-scale"
                  role="radiogroup"
                  aria-label={`${title} rating`}
                >
                  {NASA_TLX_RATINGS.map(
                    (
                      rating,
                    ) => {
                      const inputId =
                        `${groupId}-${rating}`;

                      const selected =
                        selectedValue ===
                        rating;

                      return (
                        <label
                          key={
                            rating
                          }
                          className={[
                            "nasa-likert-option",

                            selected
                              ? "nasa-likert-option-selected"
                              : "",
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " ",
                            )}
                          htmlFor={
                            inputId
                          }
                        >
                          <input
                            id={
                              inputId
                            }
                            className="nasa-likert-input"
                            type="radio"
                            name={
                              groupId
                            }
                            value={
                              rating
                            }
                            checked={
                              selected
                            }
                            disabled={
                              disabled
                            }
                            aria-label={`${title}: ${rating} out of 7`}
                            onChange={() =>
                              onChange(
                                dimension,
                                rating,
                              )
                            }
                          />

                          <span
                            className="nasa-likert-point"
                            aria-hidden="true"
                          />

                          <span
                            className="nasa-likert-number"
                            aria-hidden="true"
                          >
                            {rating}
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
                  className="nasa-scale-labels"
                  aria-hidden="true"
                >
                  <span>
                    {lowLabel}
                  </span>

                  <span>
                    {highLabel}
                  </span>
                </div>
              </fieldset>
            );
          },
        )}
      </div>
    </fieldset>
  );
}
