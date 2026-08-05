import LikertScale from "./LikertScale";

export interface ManipulationCheckValues {
  recommendationSpecificity:
    number | null;

  recommendationDetail:
    number | null;

  solutionConcreteness:
    number | null;

  solutionCompleteness:
    number | null;

  directUsability:
    number | null;

  solutionActionability:
    number | null;
}

export type ManipulationCheckDimension =
  keyof ManipulationCheckValues;

interface ManipulationCheckFormProps {
  values:
    ManipulationCheckValues;

  onChange: (
    dimension:
      ManipulationCheckDimension,
    value:
      number,
  ) => void;

  disabled?:
    boolean;

  className?:
    string;
}

interface ManipulationCheckItem {
  dimension:
    ManipulationCheckDimension;

  title:
    string;

  statement:
    string;
}

const MIN_RATING =
  1;

const MAX_RATING =
  7;

const manipulationCheckItems:
  ManipulationCheckItem[] = [
    {
      dimension:
        "recommendationSpecificity",

      title:
        "Perceived recommendation specificity",

      statement:
        "The AI recommendation was specific rather than general.",
    },

    {
      dimension:
        "recommendationDetail",

      title:
        "AI output detail",

      statement:
        "The AI recommendation included detailed task information.",
    },

    {
      dimension:
        "solutionConcreteness",

      title:
        "Perceived solution concreteness",

      statement:
        "The AI provided a concrete scheduling solution rather than only a general strategy.",
    },

    {
      dimension:
        "solutionCompleteness",

      title:
        "Perceived solution completeness",

      statement:
        "The AI provided a complete proposed schedule.",
    },

    {
      dimension:
        "directUsability",

      title:
        "Perceived direct usability",

      statement:
        "I could use the AI output directly with little additional planning.",
    },

    {
      dimension:
        "solutionActionability",

      title:
        "AI solution actionability",

      statement:
        "The AI recommendation made the actions needed to use its solution clear.",
    },
  ];

function isValidManipulationRating(
  value:
    number | null,
): value is number {
  return (
    value !==
      null &&
    Number.isInteger(
      value,
    ) &&
    value >=
      MIN_RATING &&
    value <=
      MAX_RATING
  );
}

export function createDefaultManipulationCheckValues(): ManipulationCheckValues {
  return {
    recommendationSpecificity:
      null,

    recommendationDetail:
      null,

    solutionConcreteness:
      null,

    solutionCompleteness:
      null,

    directUsability:
      null,

    solutionActionability:
      null,
  };
}

export function isManipulationCheckComplete(
  values:
    ManipulationCheckValues,
): boolean {
  return Object.values(
    values,
  ).every(
    isValidManipulationRating,
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
        Perceived AI assistance ratings
      </legend>

      <div className="likert-list">
        {manipulationCheckItems.map(
          ({
            dimension,
            title,
            statement,
          }) => (
            <LikertScale
              key={
                dimension
              }
              name={`manipulation-${dimension}`}
              title={
                title
              }
              description={
                statement
              }
              lowLabel="Strongly disagree"
              highLabel="Strongly agree"
              value={
                values[
                  dimension
                ]
              }
              min={
                MIN_RATING
              }
              max={
                MAX_RATING
              }
              required
              disabled={
                disabled
              }
              ariaLabel={`${title}, rated from ${MIN_RATING} strongly disagree to ${MAX_RATING} strongly agree`}
              onChange={(
                value,
              ) =>
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
