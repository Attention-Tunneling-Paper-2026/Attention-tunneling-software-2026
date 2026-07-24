import { useId } from "react";

export interface NasaTlxValues {
  mentalDemand: number;
  physicalDemand: number;
  temporalDemand: number;
  performance: number;
  effort: number;
  frustration: number;
}

export type NasaTlxDimension =
  keyof NasaTlxValues;

interface NasaTlxFormProps {
  values: NasaTlxValues;

  onChange: (
    dimension: NasaTlxDimension,
    value: number,
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

const nasaTlxScales: NasaTlxScale[] = [
  {
    dimension: "mentalDemand",
    title: "Mental demand",
    question:
      "How mentally demanding was the task?",
    lowLabel: "Very low",
    highLabel: "Very high",
  },
  {
    dimension: "physicalDemand",
    title: "Physical demand",
    question:
      "How physically demanding was the task?",
    lowLabel: "Very low",
    highLabel: "Very high",
  },
  {
    dimension: "temporalDemand",
    title: "Temporal demand",
    question:
      "How hurried or rushed did you feel while completing the task?",
    lowLabel: "Very low",
    highLabel: "Very high",
  },
  {
    dimension: "performance",
    title: "Performance",
    question:
      "How unsuccessful do you think you were in accomplishing the task?",
    lowLabel: "Perfect",
    highLabel: "Failure",
  },
  {
    dimension: "effort",
    title: "Effort",
    question:
      "How hard did you have to work to accomplish your level of performance?",
    lowLabel: "Very low",
    highLabel: "Very high",
  },
  {
    dimension: "frustration",
    title: "Frustration",
    question:
      "How insecure, discouraged, irritated, stressed, or annoyed did you feel?",
    lowLabel: "Very low",
    highLabel: "Very high",
  },
];

function clampValue(
  value: number,
): number {
  return Math.min(
    100,
    Math.max(0, value),
  );
}

export function createDefaultNasaTlxValues(): NasaTlxValues {
  return {
    mentalDemand: 50,
    physicalDemand: 50,
    temporalDemand: 50,
    performance: 50,
    effort: 50,
    frustration: 50,
  };
}

export default function NasaTlxForm({
  values,
  onChange,
  disabled = false,
  className = "",
}: NasaTlxFormProps) {
  const generatedId = useId();

  const formClassName = [
    "nasa-tlx-form",
    disabled
      ? "nasa-tlx-form-disabled"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      className={formClassName}
      disabled={disabled}
    >
      <legend className="sr-only">
        Task workload ratings
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
            const inputId =
              `${generatedId}-${dimension}`;

            const questionId =
              `${inputId}-question`;

            const value =
              clampValue(
                values[dimension],
              );

            return (
              <div
                key={dimension}
                className="nasa-scale-card"
              >
                <div className="nasa-scale-header">
                  <div>
                    <label
                      className="nasa-scale-title"
                      htmlFor={inputId}
                    >
                      {title}
                    </label>

                    <p id={questionId}>
                      {question}
                    </p>
                  </div>

                  <output
                    className="nasa-scale-value"
                    htmlFor={inputId}
                    aria-live="polite"
                  >
                    {value}
                  </output>
                </div>

                <input
                  id={inputId}
                  className="nasa-scale-input"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value}
                  disabled={disabled}
                  aria-describedby={
                    questionId
                  }
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={value}
                  aria-valuetext={
                    `${value} out of 100`
                  }
                  onChange={(event) =>
                    onChange(
                      dimension,
                      clampValue(
                        Number(
                          event.target.value,
                        ),
                      ),
                    )
                  }
                />

                <div
                  className="nasa-scale-labels"
                  aria-hidden="true"
                >
                  <span>
                    0
                    <small>
                      {lowLabel}
                    </small>
                  </span>

                  <span>
                    100
                    <small>
                      {highLabel}
                    </small>
                  </span>
                </div>
              </div>
            );
          },
        )}
      </div>
    </fieldset>
  );
}