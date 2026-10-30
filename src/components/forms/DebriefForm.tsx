import { useId } from "react";
import LikertScale from "./LikertScale";

export type PrimaryInfluence =
  | ""
  | "own_reasoning"
  | "ai_recommendation"
  | "task_rules"
  | "task_update"
  | "time_pressure"
  | "combination";

export type YesNoUnsure =
  | ""
  | "yes"
  | "no"
  | "unsure";

export interface DebriefFormValues {
  primaryInfluence: PrimaryInfluence;

  aiInfluence: number | null;
  aiReliance: number | null;
  decisionConfidence: number | null;
  perceivedAiCompetence: number | null;

  perceivedPurpose: string;

  noticedAiDifferences: YesNoUnsure;
  aiDifferenceDescription: string;

  taskUpdateImpact: YesNoUnsure;
  taskUpdateDescription: string;

  noticedAnythingUnusual: YesNoUnsure;
  suspicionDescription: string;

  priorStudyKnowledge: YesNoUnsure;
  priorKnowledgeDescription: string;

  additionalFeedback: string;
}

interface DebriefFormProps {
  values: DebriefFormValues;

  onChange: (
    values: DebriefFormValues,
  ) => void;

  disabled?: boolean;
  className?: string;
}

interface ResponseOption<
  TValue extends string,
> {
  value: TValue;
  label: string;
}

interface RadioQuestionProps<
  TValue extends string,
> {
  name: string;
  title: string;
  description: string;

  options: ResponseOption<TValue>[];

  value: TValue;

  onChange: (
    value: TValue,
  ) => void;

  required?: boolean;
  disabled?: boolean;
}

interface OpenResponseProps {
  id: string;
  title: string;
  description?: string;

  value: string;

  onChange: (
    value: string,
  ) => void;

  rows?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
}

const influenceOptions: ResponseOption<Exclude<
  PrimaryInfluence,
  ""
>>[] = [
  {
    value: "own_reasoning",
    label: "My own thinking and judgment",
  },
  {
    value: "ai_recommendation",
    label: "The AI recommendation",
  },
  {
    value: "task_rules",
    label: "The task rules",
  },
  {
    value: "task_update",
    label: "The update that appeared during the task",
  },
  {
    value: "time_pressure",
    label: "The remaining time",
  },
  {
    value: "combination",
    label: "A combination of these factors",
  },
];

const POST_EXPERIMENT_LIKERT_MIN =
  1;

const POST_EXPERIMENT_LIKERT_MAX =
  5;

function isValidPostExperimentLikertValue(
  value: number | null,
): value is number {
  return (
    value !==
      null &&
    Number.isInteger(
      value,
    ) &&
    value >=
      POST_EXPERIMENT_LIKERT_MIN &&
    value <=
      POST_EXPERIMENT_LIKERT_MAX
  );
}

const yesNoUnsureOptions: ResponseOption<Exclude<
  YesNoUnsure,
  ""
>>[] = [
  {
    value: "yes",
    label: "Yes",
  },
  {
    value: "no",
    label: "No",
  },
  {
    value: "unsure",
    label: "Not sure",
  },
];

export function createDefaultDebriefFormValues(): DebriefFormValues {
  return {
    primaryInfluence: "",

    aiInfluence: null,
    aiReliance: null,
    decisionConfidence: null,
    perceivedAiCompetence: null,

    perceivedPurpose: "",

    noticedAiDifferences: "",
    aiDifferenceDescription: "",

    taskUpdateImpact: "",
    taskUpdateDescription: "",

    noticedAnythingUnusual: "",
    suspicionDescription: "",

    priorStudyKnowledge: "",
    priorKnowledgeDescription: "",

    additionalFeedback: "",
  };
}

export function getDebriefValidationMessage(
  values: DebriefFormValues,
): string {
  if (
    values.primaryInfluence === "" ||
    !isValidPostExperimentLikertValue(
      values.aiInfluence,
    ) ||
    !isValidPostExperimentLikertValue(
      values.aiReliance,
    ) ||
    !isValidPostExperimentLikertValue(
      values.decisionConfidence,
    ) ||
    !isValidPostExperimentLikertValue(
      values.perceivedAiCompetence,
    )
  ) {
    return "Please select what influenced your decisions most and answer all four rating questions on the 1 to 5 scale.";
  }

  if (
    values.perceivedPurpose.trim().length === 0
  ) {
    return "Please describe what you think the study was investigating.";
  }

  if (
    values.noticedAiDifferences === ""
  ) {
    return "Please indicate whether you noticed differences in the AI assistance.";
  }

  if (
    values.noticedAiDifferences === "yes" &&
    values.aiDifferenceDescription.trim().length === 0
  ) {
    return "Please describe the differences you noticed in the AI assistance.";
  }

  if (
    values.taskUpdateImpact === ""
  ) {
    return "Please indicate whether a task update affected your approach.";
  }

  if (
    values.taskUpdateImpact === "yes" &&
    values.taskUpdateDescription.trim().length === 0
  ) {
    return "Please describe how the task update affected your approach.";
  }

  if (
    values.noticedAnythingUnusual === ""
  ) {
    return "Please indicate whether you noticed anything unusual.";
  }

  if (
    values.noticedAnythingUnusual === "yes" &&
    values.suspicionDescription.trim().length === 0
  ) {
    return "Please describe what appeared unusual or what you suspected.";
  }

  if (
    values.priorStudyKnowledge === ""
  ) {
    return "Please indicate whether anyone told you about the study before you took part.";
  }

  if (
    values.priorStudyKnowledge === "yes" &&
    values.priorKnowledgeDescription.trim().length === 0
  ) {
    return "Please describe what you knew about the study before taking part.";
  }

  return "";
}

export function isDebriefFormComplete(
  values: DebriefFormValues,
): boolean {
  return (
    getDebriefValidationMessage(
      values,
    ).length === 0
  );
}

function RadioQuestion<
  TValue extends string,
>({
  name,
  title,
  description,
  options,
  value,
  onChange,
  required = true,
  disabled = false,
}: RadioQuestionProps<TValue>) {
  return (
    <fieldset
      className="radio-question-card"
      disabled={disabled}
    >
      <legend>
        <strong>{title}</strong>

        <span>{description}</span>
      </legend>

      <div className="radio-question-options">
        {options.map((option) => {
          const selected =
            value === option.value;

          return (
            <label
              key={option.value}
              className={[
                "radio-question-option",
                selected
                  ? "radio-question-option-selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                required={required}
                disabled={disabled}
                onChange={() =>
                  onChange(
                    option.value,
                  )
                }
              />

              <span>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function OpenResponse({
  id,
  title,
  description,
  value,
  onChange,
  rows = 4,
  maxLength = 1200,
  required = false,
  disabled = false,
}: OpenResponseProps) {
  const descriptionId =
    description
      ? `${id}-description`
      : undefined;

  return (
    <div className="open-response-card">
      <label htmlFor={id}>
        <strong>{title}</strong>

        {description ? (
          <span id={descriptionId}>
            {description}
          </span>
        ) : null}
      </label>

      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        aria-describedby={
          descriptionId
        }
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
      />

      <div className="response-character-count">
        {value.length} of{" "}
        {maxLength}
      </div>
    </div>
  );
}

export default function DebriefForm({
  values,
  onChange,
  disabled = false,
  className = "",
}: DebriefFormProps) {
  const generatedId = useId();

  function updateValue<
    TKey extends keyof DebriefFormValues,
  >(
    key: TKey,
    value: DebriefFormValues[TKey],
  ) {
    onChange({
      ...values,
      [key]: value,
    });
  }

  const formClassName = [
    "debrief-form",
    disabled
      ? "debrief-form-disabled"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={formClassName}>
      <section className="debrief-form-section">
        <div className="debrief-form-section-header">
          <h2>
            What influenced your decisions
          </h2>

          <p>
            Think about what influenced your final
            decisions across all three tasks.
          </p>
        </div>

        <div className="questionnaire-question-list">
          <RadioQuestion
            name={`${generatedId}-primary-influence`}
            title="Primary influence"
            description="Thinking about all three tasks, what influenced your final decisions the most?"
            options={influenceOptions}
            value={values.primaryInfluence}
            required
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "primaryInfluence",
                value,
              )
            }
          />

          <LikertScale
            name={`${generatedId}-ai-influence`}
            title="AI influence"
            description="The AI recommendations influenced the final decisions I made in the tasks."
            lowLabel="Strongly disagree"
            highLabel="Strongly agree"
            value={values.aiInfluence}
            min={POST_EXPERIMENT_LIKERT_MIN}
            max={POST_EXPERIMENT_LIKERT_MAX}
            required
            ariaLabel="AI influence, rated from 1 strongly disagree to 5 strongly agree"
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "aiInfluence",
                value,
              )
            }
          />

          <LikertScale
            name={`${generatedId}-ai-reliance`}
            title="Reliance on the AI"
            description="When I was unsure what to do, I relied on the AI recommendation."
            lowLabel="Strongly disagree"
            highLabel="Strongly agree"
            value={values.aiReliance}
            min={POST_EXPERIMENT_LIKERT_MIN}
            max={POST_EXPERIMENT_LIKERT_MAX}
            required
            ariaLabel="Reliance on the AI, rated from 1 strongly disagree to 5 strongly agree"
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "aiReliance",
                value,
              )
            }
          />

          <LikertScale
            name={`${generatedId}-decision-confidence`}
            title="Decision confidence"
            description="I felt confident about the final solutions I submitted."
            lowLabel="Strongly disagree"
            highLabel="Strongly agree"
            value={values.decisionConfidence}
            min={POST_EXPERIMENT_LIKERT_MIN}
            max={POST_EXPERIMENT_LIKERT_MAX}
            required
            ariaLabel="Decision confidence, rated from 1 strongly disagree to 5 strongly agree"
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "decisionConfidence",
                value,
              )
            }
          />

          <LikertScale
            name={`${generatedId}-ai-competence`}
            title="Overall AI ability"
            description="The AI assistant seemed capable of helping me solve the tasks."
            lowLabel="Strongly disagree"
            highLabel="Strongly agree"
            value={
              values.perceivedAiCompetence
            }
            min={POST_EXPERIMENT_LIKERT_MIN}
            max={POST_EXPERIMENT_LIKERT_MAX}
            required
            ariaLabel="Overall AI ability, rated from 1 strongly disagree to 5 strongly agree"
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "perceivedAiCompetence",
                value,
              )
            }
          />
        </div>
      </section>

      <section className="debrief-form-section">
        <div className="debrief-form-section-header">
          <h2>
            Your understanding of the study
          </h2>

          <p>
            Please answer in your own words. There are no
            right or wrong answers.
          </p>
        </div>

        <OpenResponse
          id={`${generatedId}-perceived-purpose`}
          title="What do you think this study was investigating?"
          description="What do you think the researchers were trying to find out in this study?"
          value={values.perceivedPurpose}
          rows={5}
          maxLength={1500}
          required
          disabled={disabled}
          onChange={(value) =>
            updateValue(
              "perceivedPurpose",
              value,
            )
          }
        />
      </section>

      <section className="debrief-form-section">
        <div className="debrief-form-section-header">
          <h2>
            AI assistance
          </h2>

          <p>
            Think about whether the help provided by the AI
            differed across the three tasks.
          </p>
        </div>

        <div className="questionnaire-question-list">
          <RadioQuestion
            name={`${generatedId}-ai-differences`}
            title="Differences between tasks"
            description="Did the amount of detail or the type of help provided by the AI differ between the tasks?"
            options={yesNoUnsureOptions}
            value={
              values.noticedAiDifferences
            }
            required
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "noticedAiDifferences",
                value,
              )
            }
          />

          {values.noticedAiDifferences ===
            "yes" ||
          values.noticedAiDifferences ===
            "unsure" ? (
            <OpenResponse
              id={`${generatedId}-ai-difference-description`}
              title="Please describe any differences you noticed"
              description="What differences did you notice in what the AI said, how much detail it gave, how it presented its help, or how useful its help was?"
              value={
                values.aiDifferenceDescription
              }
              required={
                values.noticedAiDifferences ===
                "yes"
              }
              disabled={disabled}
              onChange={(value) =>
                updateValue(
                  "aiDifferenceDescription",
                  value,
                )
              }
            />
          ) : null}
        </div>
      </section>

      <section className="debrief-form-section">
        <div className="debrief-form-section-header">
          <h2>
            Task updates
          </h2>

          <p>
            Think about the information updates that appeared
            while you were working on the tasks.
          </p>
        </div>

        <div className="questionnaire-question-list">
          <RadioQuestion
            name={`${generatedId}-task-update-impact`}
            title="Effect of the update"
            description="Did an update shown during any task change how you approached that task or the final solution you submitted?"
            options={yesNoUnsureOptions}
            value={
              values.taskUpdateImpact
            }
            required
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "taskUpdateImpact",
                value,
              )
            }
          />

          {values.taskUpdateImpact ===
            "yes" ||
          values.taskUpdateImpact ===
            "unsure" ? (
            <OpenResponse
              id={`${generatedId}-task-update-description`}
              title="Please describe the effect of the update"
              description="How did the update affect your decisions? Describe what you changed, thought about changing, or decided to keep the same."
              value={
                values.taskUpdateDescription
              }
              required={
                values.taskUpdateImpact ===
                "yes"
              }
              disabled={disabled}
              onChange={(value) =>
                updateValue(
                  "taskUpdateDescription",
                  value,
                )
              }
            />
          ) : null}
        </div>
      </section>

      <section className="debrief-form-section">
        <div className="debrief-form-section-header">
          <h2>
            What you noticed or knew about the study
          </h2>

          <p>
            These questions ask what you noticed during the study
            and what you knew before taking part.
          </p>
        </div>

        <div className="questionnaire-question-list">
          <RadioQuestion
            name={`${generatedId}-unusual-features`}
            title="Anything unusual or unexpected"
            description="Did you notice anything unusual or have any suspicions about the tasks, AI assistant, or the purpose of the study?"
            options={yesNoUnsureOptions}
            value={
              values.noticedAnythingUnusual
            }
            required
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "noticedAnythingUnusual",
                value,
              )
            }
          />

          {values.noticedAnythingUnusual ===
            "yes" ||
          values.noticedAnythingUnusual ===
            "unsure" ? (
            <OpenResponse
              id={`${generatedId}-suspicion-description`}
              title="Please describe what you noticed or suspected"
              value={
                values.suspicionDescription
              }
              required={
                values.noticedAnythingUnusual ===
                "yes"
              }
              disabled={disabled}
              onChange={(value) =>
                updateValue(
                  "suspicionDescription",
                  value,
                )
              }
            />
          ) : null}

          <RadioQuestion
            name={`${generatedId}-prior-study-knowledge`}
            title="What you knew before taking part"
            description="Before you took part, had anyone told you what this study was testing, what results the researchers expected, or that the AI would provide different types of help?"
            options={yesNoUnsureOptions}
            value={
              values.priorStudyKnowledge
            }
            required
            disabled={disabled}
            onChange={(value) =>
              updateValue(
                "priorStudyKnowledge",
                value,
              )
            }
          />

          {values.priorStudyKnowledge ===
            "yes" ||
          values.priorStudyKnowledge ===
            "unsure" ? (
            <OpenResponse
              id={`${generatedId}-prior-knowledge-description`}
              title="Please describe what you knew before taking part"
              value={
                values.priorKnowledgeDescription
              }
              required={
                values.priorStudyKnowledge ===
                "yes"
              }
              disabled={disabled}
              onChange={(value) =>
                updateValue(
                  "priorKnowledgeDescription",
                  value,
                )
              }
            />
          ) : null}
        </div>
      </section>

      <section className="debrief-form-section">
        <div className="debrief-form-section-header">
          <h2>
            Additional feedback
          </h2>

          <p>
            This feedback is optional.
          </p>
        </div>

        <OpenResponse
          id={`${generatedId}-additional-feedback`}
          title="Is there anything else you would like to tell us about your experience?"
          value={
            values.additionalFeedback
          }
          rows={5}
          maxLength={1500}
          disabled={disabled}
          onChange={(value) =>
            updateValue(
              "additionalFeedback",
              value,
            )
          }
        />
      </section>
    </div>
  );
}
