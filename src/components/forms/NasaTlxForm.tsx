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

const NASA_TLX_SCALES:
  readonly NasaTlxScale[] = [
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
    "questionnaire-rating-form",

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

      <div className="nasa-scale-list questionnaire-rating-list">
        {NASA_TLX_SCALES.map(
          ({
            dimension,
            title,
            question,
            lowLabel,
            highLabel,
          }) => {
            const groupId =
              `${generatedId}-${dimension}`;

            const titleId =
              `${groupId}-title`;

            const questionId =
              `${groupId}-question`;

            const labelsId =
              `${groupId}-labels`;

            const statusId =
              `${groupId}-status`;

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
                className="nasa-scale-card questionnaire-rating-card"
                aria-labelledby={
                  titleId
                }
                aria-describedby={`${questionId} ${labelsId} ${statusId}`}
              >
                <legend className="nasa-scale-title questionnaire-rating-title">
                  <span
                    id={
                      titleId
                    }
                  >
                    {title}
                  </span>
                </legend>

                <div className="nasa-scale-header questionnaire-rating-header">
                  <p
                    id={
                      questionId
                    }
                    className="questionnaire-rating-question"
                  >
                    {question}
                  </p>

                  <output
                    id={
                      statusId
                    }
                    className="nasa-scale-value questionnaire-rating-value"
                    aria-live="polite"
                  >
                    {selectedValue ===
                    null
                      ? "Not selected"
                      : `${selectedValue} of 7`}
                  </output>
                </div>

                <div
                  className="nasa-likert-scale questionnaire-rating-options questionnaire-rating-options-eight"
                  role="radiogroup"
                  aria-label={`${title} rating from 0 to 7`}
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
                            "questionnaire-rating-option",

                            selected
                              ? "nasa-likert-option-selected questionnaire-rating-option-selected"
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
                            className="nasa-likert-input questionnaire-rating-input"
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
                            onChange={() => {
                              onChange(
                                dimension,
                                rating,
                              );
                            }}
                          />

                          <span
                            className="nasa-likert-point questionnaire-rating-point"
                            aria-hidden="true"
                          />

                          <span
                            className="nasa-likert-number questionnaire-rating-number"
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
                  className="nasa-scale-labels questionnaire-rating-labels"
                >
                  <span>
                    <strong>
                      0
                    </strong>

                    <small>
                      {lowLabel}
                    </small>
                  </span>

                  <span>
                    <strong>
                      7
                    </strong>

                    <small>
                      {highLabel}
                    </small>
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
