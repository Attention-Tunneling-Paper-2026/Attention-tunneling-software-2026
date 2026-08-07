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

  /*
   * One label per scale point, low to high. NASA-TLX itself anchors only the
   * endpoints; these fill in the intermediate points with the conventional
   * symmetric intensity wording so a participant can read back what they
   * chose. The endpoints stay verbatim from the instrument, and the two
   * anchors printed under the scale are taken from this array so they cannot
   * drift from the readout. The recorded response is still the 1-7 rating.
   */
  ratingLabels: readonly string[];
}

const INTENSITY_RATING_LABELS:
  readonly string[] = [
    "Very low",
    "Low",
    "Somewhat low",
    "Moderate",
    "Somewhat high",
    "High",
    "Very high",
  ];

/*
 * Performance runs from "Perfect" to "Failure" on NASA-TLX, so its labels
 * describe how well the participant performed rather than an intensity.
 */
const PERFORMANCE_RATING_LABELS:
  readonly string[] = [
    "Perfect",
    "Very good",
    "Somewhat good",
    "Moderate",
    "Somewhat poor",
    "Poor",
    "Failure",
  ];

function getRatingLabel(
  ratingLabels:
    readonly string[],

  rating:
    number,
): string {
  return (
    ratingLabels[
      rating -
      1
    ] ??
    ""
  );
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

      ratingLabels:
        INTENSITY_RATING_LABELS,
    },

    {
      dimension:
        "physicalDemand",

      title:
        "Physical demand",

      question:
        "How physically demanding was the task?",

      ratingLabels:
        INTENSITY_RATING_LABELS,
    },

    {
      dimension:
        "temporalDemand",

      title:
        "Temporal demand",

      question:
        "How hurried or rushed did you feel while completing the task?",

      ratingLabels:
        INTENSITY_RATING_LABELS,
    },

    {
      dimension:
        "performance",

      title:
        "Performance",

      question:
        "How unsuccessful do you think you were in accomplishing the task?",

      ratingLabels:
        PERFORMANCE_RATING_LABELS,
    },

    {
      dimension:
        "effort",

      title:
        "Effort",

      question:
        "How hard did you have to work to accomplish your level of performance?",

      ratingLabels:
        INTENSITY_RATING_LABELS,
    },

    {
      dimension:
        "frustration",

      title:
        "Frustration",

      question:
        "How insecure, discouraged, irritated, stressed, or annoyed did you feel?",

      ratingLabels:
        INTENSITY_RATING_LABELS,
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
            ratingLabels,
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

            const lowLabel =
              getRatingLabel(
                ratingLabels,
                1,
              );

            const highLabel =
              getRatingLabel(
                ratingLabels,
                NASA_TLX_RATINGS.length,
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
                    className={[
                      "nasa-scale-value",
                      "questionnaire-rating-value",

                      selectedValue ===
                      null
                        ? "questionnaire-rating-value-empty"
                        : "questionnaire-rating-value-answered",
                    ].join(
                      " ",
                    )}
                    aria-live="polite"
                  >
                    {selectedValue ===
                    null ? (
                      "Not selected"
                    ) : (
                      <>
                        <span className="questionnaire-rating-value-label">
                          {getRatingLabel(
                            ratingLabels,
                            selectedValue,
                          )}
                        </span>

                        <span className="questionnaire-rating-value-count">
                          {selectedValue} of{" "}
                          {NASA_TLX_RATINGS.length}
                        </span>
                      </>
                    )}
                  </output>
                </div>

                <div
                  className="nasa-likert-scale questionnaire-rating-options questionnaire-rating-options-seven"
                  role="radiogroup"
                  aria-label={`${title} rating from 1 to 7`}
                  aria-required="true"
                  data-scale-min="1"
                  data-scale-max="7"
                  data-option-count={
                    NASA_TLX_RATINGS.length
                  }
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

                      const ratingLabel =
                        getRatingLabel(
                          ratingLabels,
                          rating,
                        );

                      return (
                        <label
                          key={
                            rating
                          }
                          title={
                            ratingLabel
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
                            required
                            disabled={
                              disabled
                            }
                            aria-label={`${title}: ${ratingLabel}, ${rating} of ${NASA_TLX_RATINGS.length}`}
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
                      1
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
