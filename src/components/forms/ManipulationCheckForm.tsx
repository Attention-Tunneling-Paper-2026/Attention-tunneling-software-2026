import LikertScale from "./LikertScale";

export interface ManipulationCheckValues {
  recommendationSpecificity: number | null;
  solutionConcreteness: number | null;
  solutionCompleteness: number | null;
  directUsability: number | null;
}

export type ManipulationCheckDimension =
  keyof ManipulationCheckValues;

interface ManipulationCheckFormProps {
  values: ManipulationCheckValues;

  onChange: (
    dimension: ManipulationCheckDimension,
    value: number,
  ) => void;

  disabled?: boolean;
  className?: string;
}

interface ManipulationCheckItem {
  dimension: ManipulationCheckDimension;
  title: string;
  statement: string;
}

const manipulationCheckItems: ManipulationCheckItem[] = [
  {
    dimension: "recommendationSpecificity",
    title: "Recommendation specificity",
    statement:
      "The AI recommendation was specific rather than general.",
  },
  {
    dimension: "solutionConcreteness",
    title: "Solution concreteness",
    statement:
      "The AI provided a concrete scheduling solution rather than only a general strategy.",
  },
  {
    dimension: "solutionCompleteness",
    title: "Solution completeness",
    statement:
      "The AI provided a complete proposed schedule.",
  },
  {
    dimension: "directUsability",
    title: "Direct usability",
    statement:
      "I could use the AI output directly with little additional planning.",
  },
];

export function createDefaultManipulationCheckValues(): ManipulationCheckValues {
  return {
    recommendationSpecificity: null,
    solutionConcreteness: null,
    solutionCompleteness: null,
    directUsability: null,
  };
}

export function isManipulationCheckComplete(
  values: ManipulationCheckValues,
): boolean {
  return Object.values(values).every(
    (value) => value !== null,
  );
}

export default function ManipulationCheckForm({
  values,
  onChange,
  disabled = false,
  className = "",
}: ManipulationCheckFormProps) {
  const formClassName = [
    "manipulation-check-form",
    disabled
      ? "manipulation-check-form-disabled"
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
        AI assistance ratings
      </legend>

      <div className="likert-list">
        {manipulationCheckItems.map(
          ({
            dimension,
            title,
            statement,
          }) => (
            <LikertScale
              key={dimension}
              name={`manipulation-${dimension}`}
              title={title}
              description={statement}
              lowLabel="Strongly disagree"
              highLabel="Strongly agree"
              value={values[dimension]}
              disabled={disabled}
              onChange={(value) =>
                onChange(
                  dimension,
                  value,
                )
              }
            />
          ),
        )}
      </div>
    </fieldset>
  );
}