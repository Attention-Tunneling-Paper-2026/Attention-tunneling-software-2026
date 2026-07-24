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
    label: "My own reasoning and judgment",
  },
  {
    value: "ai_recommendation",
    label: "The AI recommendation",
  },
  {
    value: "task_rules",
    label: "The task constraints and preferences",
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
    values.aiInfluence === null ||
    values.aiReliance === null ||
    values.decisionConfidence === null ||
    values.perceivedAiCompetence === null
  ) {
    return "Please answer all decision attribution questions.";
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
    return "Please indicate whether you had prior knowledge of the study.";
  }

  if (
    values.priorStudyKnowledge === "yes" &&
    values.priorKnowledgeDescription.trim().length === 0
  ) {
    return "Please describe what you knew about the study before participating.";
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
            Decision attribution
          </h2>

          <p>
            Consider what influenced your final
            scheduling decisions across the tasks.
          </p>
        </div>

        <div className="questionnaire-question-list">
          <RadioQuestion
            name={`${generatedId}-primary-influence`}
            title="Primary influence"
            description="Which factor had the greatest influence on your final schedules overall?"
            options={influenceOptions}
            value={values.primaryInfluence}
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
            description="The AI recommendations influenced my final scheduling decisions."
            lowLabel="Strongly disagree"
            highLabel="Strongly agree"
            value={values.aiInfluence}
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
            description="When I was uncertain, I relied on the AI recommendation."
            lowLabel="Strongly disagree"
            highLabel="Strongly agree"
            value={values.aiReliance}
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
            description="I was confident in the final schedules I submitted."
            lowLabel="Strongly disagree"
            highLabel="Strongly agree"
            value={values.decisionConfidence}
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
            title="Overall AI competence"
            description="The AI assistant appeared competent across the scheduling tasks."
            lowLabel="Strongly disagree"
            highLabel="Strongly agree"
            value={
              values.perceivedAiCompetence
            }
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
          description="Describe the purpose of the study as you understood it."
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
            Reflect on whether the AI assistance appeared
            different across the tasks.
          </p>
        </div>

        <div className="questionnaire-question-list">
          <RadioQuestion
            name={`${generatedId}-ai-differences`}
            title="Differences between tasks"
            description="Did the AI assistant appear to provide different amounts of detail or different forms of assistance across the tasks?"
            options={yesNoUnsureOptions}
            value={
              values.noticedAiDifferences
            }
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
              description="You may describe the content, detail, presentation, or usefulness of the AI assistance."
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
            Consider the information update that appeared
            while you were scheduling.
          </p>
        </div>

        <div className="questionnaire-question-list">
          <RadioQuestion
            name={`${generatedId}-task-update-impact`}
            title="Effect of the update"
            description="Did an update that appeared during a task change your scheduling approach or final decision?"
            options={yesNoUnsureOptions}
            value={
              values.taskUpdateImpact
            }
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
              description="Explain what you changed, considered changing, or decided not to change."
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
            Study awareness
          </h2>

          <p>
            These questions help us understand how
            participants interpreted the study.
          </p>
        </div>

        <div className="questionnaire-question-list">
          <RadioQuestion
            name={`${generatedId}-unusual-features`}
            title="Unusual features or suspicions"
            description="Did you notice anything unusual or form any suspicions about the task, AI assistant, or study purpose?"
            options={yesNoUnsureOptions}
            value={
              values.noticedAnythingUnusual
            }
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
            title="Prior knowledge"
            description="Before participating, had anyone told you about the study purpose, expected results, or different AI assistance conditions?"
            options={yesNoUnsureOptions}
            value={
              values.priorStudyKnowledge
            }
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
              title="Please describe what you knew"
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
            This final response is optional.
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