import {
  TASK_ANALYSIS_BENCHMARKS_BY_ID,
  TASK_SCORING_BY_ID,
  calculateParetoEfficiencyPercentage,
  calculateParetoEfficiencyProportion,
  getVerifiedGlobalOptimumScore,
  isSupportedStudyTaskId,
} from "../data/symposium";

import type {
  SupportedStudyTaskId,
} from "../data/symposium";

import type {
  StudyEvent,
} from "../types/events";

import {
  getProbeRecallCorrect,
  getProbeRecognitionCorrect,
  isLikertRating,
  isNasaTlxValue,
} from "../types/questionnaire";

import type {
  TrialQuestionnaireResponse,
} from "../types/questionnaire";

import type {
  StudyTrialProgress,
} from "../types/study";

export type TrialMetricRow =
  Record<
    string,
    string | number | boolean | null
  >;

/*
 * CSV exports use numeric binary coding for JASP compatibility.
 * Text and numeric values are preserved, while booleans become 1 or 0.
 */
function normalizeTrialMetricRow(
  row: TrialMetricRow,
): TrialMetricRow {
  return Object.fromEntries(
    Object.entries(row).map(
      ([key, value]) => [
        key,
        typeof value === "boolean"
          ? value
            ? 1
            : 0
          : value,
      ],
    ),
  ) as TrialMetricRow;
}

interface BuildTrialSummaryRowsInput {
  participantId:
    string;

  sessionId:
    string;

  trial:
    StudyTrialProgress;

  questionnaireResponse:
    TrialQuestionnaireResponse;

  events:
    StudyEvent[];
}

interface StateObservation {
  elapsedMs:
    number;

  stateHash:
    string;

  schedule:
    string;

  structuralSignature:
    string;

  macroStructureSignature:
    string;

  roomCompositionSignature:
    string;

  hammingDistanceFromAI:
    number | null;

  insideAIFamily:
    boolean | null;
}

interface AcceptedEditAnnotation {
  acceptedEditIndex:
    number;

  cumulativeAcceptedEditsBefore:
    number;

  cumulativeAcceptedEditsAfter:
    number;

  salvageMacroStructurePreserved:
    boolean | null;

  salvageRunIndex:
    number | null;

  salvageRunPosition:
    number | null;
}

interface SalvageRun {
  runIndex:
    number;

  length:
    number;

  startEvent:
    StudyEvent;

  endEvent:
    StudyEvent;

  startAcceptedEditIndex:
    number;

  endAcceptedEditIndex:
    number;
}

type UnknownRecord =
  Record<
    string,
    unknown
  >;

const TRIALS_PER_TASK = 3;

const TASK_ORDER: Record<
  SupportedStudyTaskId,
  number
> = {
  symposium: 1,
  delivery: 2,
  clinic: 3,
};

const STATE_HASH_DEFINITION_BY_TASK: Record<
  SupportedStudyTaskId,
  string
> = {
  symposium:
    "exact_talk_to_room_slot_assignment",
  delivery:
    "exact_shipment_to_van_route_window_assignment",
  clinic:
    "exact_duty_to_ward_shift_assignment",
};

const STRUCTURAL_SIGNATURE_DEFINITION_BY_TASK: Record<
  SupportedStudyTaskId,
  string
> = {
  symposium:
    "room_slot_topic_pattern",
  delivery:
    "van_route_window_region_pattern",
  clinic:
    "ward_shift_specialty_pattern",
};

const MACRO_STRUCTURE_DEFINITION_BY_TASK: Record<
  SupportedStudyTaskId,
  string
> = {
  symposium:
    "room_majority_topic_mapping_ignoring_slot_order",
  delivery:
    "van_majority_region_mapping_ignoring_window_order",
  clinic:
    "ward_majority_specialty_mapping_ignoring_shift_order",
};

const THEORETICAL_EDIT_TAXONOMY_VERSION_BY_TASK: Record<
  SupportedStudyTaskId,
  string
> = {
  symposium:
    "symposium_edit_taxonomy_v1",
  delivery:
    "delivery_edit_taxonomy_v1",
  clinic:
    "clinic_edit_taxonomy_v1",
};

function getSalvageCountingAnchorReason(
  event:
    StudyEvent | undefined,
): string | null {
  if (
    !event
  ) {
    return null;
  }

  return event.eventType ===
    "trial_start"
    ? "visible_constraint_violation_present_at_trial_start"
    : "first_visible_violation_after_edit";
}

function resolveTaskId(
  ...values: unknown[]
): SupportedStudyTaskId {
  for (const value of values) {
    if (isSupportedStudyTaskId(value)) {
      return value;
    }
  }

  return "symposium";
}

function getOuterTaskNumber(
  taskId: SupportedStudyTaskId,
): number {
  return TASK_ORDER[taskId];
}

function getInnerTaskNumber(
  value: unknown,
): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= TRIALS_PER_TASK
    ? value
    : null;
}

function getGlobalTrialNumber(
  taskId: SupportedStudyTaskId,
  trialNumber: unknown,
): number | null {
  const innerTaskNumber =
    getInnerTaskNumber(trialNumber);

  return innerTaskNumber === null
    ? null
    : (getOuterTaskNumber(taskId) - 1) *
        TRIALS_PER_TASK +
        innerTaskNumber;
}

function getCompositeTrialId(
  taskId: SupportedStudyTaskId,
  condition: unknown,
  trialNumber: unknown,
): string {
  const suffix =
    typeof condition === "string" &&
    condition.length > 0
      ? condition
      : getInnerTaskNumber(trialNumber) ??
        "unknown";

  return `${taskId}-${suffix}`;
}

function asRecord(
  value:
    unknown,
): UnknownRecord {
  if (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  ) {
    return value as
      UnknownRecord;
  }

  return {};
}

function readEventValue(
  event:
    StudyEvent | undefined,

  key:
    string,
): unknown {
  if (
    !event
  ) {
    return undefined;
  }

  return (
    event as unknown as
      UnknownRecord
  )[key];
}

function readMetadataValue(
  event:
    StudyEvent | undefined,

  key:
    string,
): unknown {
  if (
    !event
  ) {
    return undefined;
  }

  const metadata =
    asRecord(
      event.metadata,
    );

  return metadata[
    key
  ];
}

function firstDefined(
  ...values:
    unknown[]
): unknown {
  return values.find(
    (value) =>
      value !==
        undefined &&
      value !==
        null &&
      value !==
        "",
  );
}

function toStringValue(
  value:
    unknown,
): string {
  return typeof value ===
    "string"
    ? value
    : "";
}

function toNumberValue(
  value:
    unknown,
): number | null {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  )
    ? value
    : null;
}

function toNasaTlxCsvValue(
  value:
    unknown,
): number | null {
  return isNasaTlxValue(
    value,
  )
    ? value
    : null;
}

function toLikertCsvValue(
  value:
    unknown,
): number | null {
  return isLikertRating(
    value,
  )
    ? value
    : null;
}

function toNonNegativeNumber(
  value:
    number | null,
): number | null {
  return value !==
      null &&
    value >=
      0
    ? value
    : null;
}

function getCollectionItemCount(
  value:
    unknown,
): number | null {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.length;
  }

  if (
    typeof value ===
      "string" &&
    value.length >
      0
  ) {
    try {
      const parsed:
        unknown =
          JSON.parse(
            value,
          );

      return Array.isArray(
        parsed,
      )
        ? parsed.length
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function toBooleanValue(
  value:
    unknown,
): boolean | null {
  return typeof value ===
    "boolean"
    ? value
    : null;
}

function serializeValue(
  value:
    unknown,
): string {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "";
  }

  if (
    typeof value ===
      "string"
  ) {
    return value;
  }

  if (
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value,
    );
  }

  try {
    return JSON.stringify(
      value,
    );
  } catch {
    return String(
      value,
    );
  }
}

function eventString(
  event:
    StudyEvent | undefined,

  field:
    string,

  metadataField?:
    string,
): string {
  return toStringValue(
    firstDefined(
      readEventValue(
        event,
        field,
      ),

      metadataField
        ? readMetadataValue(
            event,
            metadataField,
          )
        : undefined,
    ),
  );
}

function eventNumber(
  event:
    StudyEvent | undefined,

  field:
    string,

  metadataField?:
    string,
): number | null {
  return toNumberValue(
    firstDefined(
      readEventValue(
        event,
        field,
      ),

      metadataField
        ? readMetadataValue(
            event,
            metadataField,
          )
        : undefined,
    ),
  );
}

function eventBoolean(
  event:
    StudyEvent | undefined,

  field:
    string,

  metadataField?:
    string,
): boolean | null {
  return toBooleanValue(
    firstDefined(
      readEventValue(
        event,
        field,
      ),

      metadataField
        ? readMetadataValue(
            event,
            metadataField,
          )
        : undefined,
    ),
  );
}

function sortEvents(
  events:
    StudyEvent[],
): StudyEvent[] {
  return [
    ...events,
  ].sort(
    (
      first,
      second,
    ) => {
      if (
        first.eventIndex !==
        second.eventIndex
      ) {
        return (
          first.eventIndex -
          second.eventIndex
        );
      }

      if (
        first.elapsedMs !==
        second.elapsedMs
      ) {
        return (
          first.elapsedMs -
          second.elapsedMs
        );
      }

      return first.timestampIso.localeCompare(
        second.timestampIso,
      );
    },
  );
}

function getFirstEvent(
  events:
    StudyEvent[],

  eventType:
    StudyEvent["eventType"],
): StudyEvent | undefined {
  return events.find(
    (event) =>
      event.eventType ===
      eventType,
  );
}

function getLastEvent(
  events:
    StudyEvent[],

  eventType:
    StudyEvent["eventType"],
): StudyEvent | undefined {
  for (
    let index =
      events.length -
      1;
    index >=
      0;
    index -=
      1
  ) {
    if (
      events[
        index
      ].eventType ===
      eventType
    ) {
      return events[
        index
      ];
    }
  }

  return undefined;
}

function getLastAcceptedSubmitAttempt(
  events:
    StudyEvent[],
): StudyEvent | undefined {
  for (
    let index =
      events.length -
      1;
    index >=
      0;
    index -=
      1
  ) {
    const event =
      events[
        index
      ];

    if (
      event.eventType !==
        "submit_attempt"
    ) {
      continue;
    }

    const accepted =
      event.accepted ??
      toBooleanValue(
        readMetadataValue(
          event,
          "accepted",
        ),
      );

    if (
      accepted ===
      true
    ) {
      return event;
    }
  }

  return undefined;
}

function getFinalSubmissionEvent(
  events:
    StudyEvent[],
): StudyEvent | undefined {
  return (
    getLastEvent(
      events,
      "trial_end",
    ) ??
    getLastEvent(
      events,
      "trial_submitted",
    ) ??
    getLastAcceptedSubmitAttempt(
      events,
    )
  );
}

function isAcceptedEdit(
  event:
    StudyEvent,
): boolean {
  const acceptedEditEvent =
    event.eventType ===
      "drop" ||
    event.eventType ===
      "move" ||
    event.eventType ===
      "swap" ||
    event.eventType ===
      "unplace";

  return (
    acceptedEditEvent &&
    event.success ===
      true
  );
}

function countTrue(
  events:
    StudyEvent[],

  field:
    string,

  metadataField?:
    string,
): number {
  return events.filter(
    (event) =>
      eventBoolean(
        event,
        field,
        metadataField,
      ) ===
      true,
  ).length;
}

function getElapsedDifference(
  later:
    StudyEvent | undefined,

  earlier:
    StudyEvent | undefined,
): number | null {
  if (
    !later ||
    !earlier
  ) {
    return null;
  }

  return (
    later.elapsedMs -
    earlier.elapsedMs
  );
}

function getElapsedDifferenceFromReference(
  later:
    StudyEvent | undefined,

  earlier:
    StudyEvent | undefined,
): number | null {
  return toNonNegativeNumber(
    getElapsedDifference(
      later,
      earlier,
    ),
  );
}

function getEarlierEvent(
  first:
    StudyEvent | undefined,

  second:
    StudyEvent | undefined,
): StudyEvent | undefined {
  if (
    !first
  ) {
    return second;
  }

  if (
    !second
  ) {
    return first;
  }

  return first.elapsedMs <=
    second.elapsedMs
    ? first
    : second;
}

function calculateMean(
  values:
    number[],
): number | null {
  if (
    values.length ===
    0
  ) {
    return null;
  }

  return values.reduce(
    (
      total,
      value,
    ) =>
      total +
      value,
    0,
  ) /
    values.length;
}

function calculateMaximum(
  values:
    number[],
): number | null {
  return values.length >
    0
    ? Math.max(
        ...values,
      )
    : null;
}

function calculateEntropy(
  values:
    string[],
): number {
  if (
    values.length ===
    0
  ) {
    return 0;
  }

  const frequencies =
    new Map<
      string,
      number
    >();

  for (
    const value of
    values
  ) {
    frequencies.set(
      value,
      (
        frequencies.get(
          value,
        ) ??
        0
      ) +
        1,
    );
  }

  let entropy =
    0;

  for (
    const frequency of
    frequencies.values()
  ) {
    const probability =
      frequency /
      values.length;

    entropy -=
      probability *
      Math.log2(
        probability,
      );
  }

  return entropy;
}

function parseCanonicalSchedule(
  schedule:
    string,
): Map<
  string,
  string
> {
  const assignments =
    new Map<
      string,
      string
    >();

  for (
    const segment of
    schedule.split(
      "|",
    )
  ) {
    const separatorIndex =
      segment.indexOf(
        "=",
      );

    if (
      separatorIndex <
      0
    ) {
      continue;
    }

    const cell =
      segment
        .slice(
          0,
          separatorIndex,
        )
        .trim();

    const talkId =
      segment
        .slice(
          separatorIndex +
            1,
        )
        .trim();

    if (
      cell.length ===
        0 ||
      talkId.length ===
        0 ||
      talkId ===
        "EMPTY" ||
      talkId ===
        "UNASSIGNED"
    ) {
      continue;
    }

    assignments.set(
      talkId,
      cell,
    );
  }

  return assignments;
}

function calculateScheduleHammingDistance(
  firstSchedule:
    string,

  secondSchedule:
    string,
): number {
  const first =
    parseCanonicalSchedule(
      firstSchedule,
    );

  const second =
    parseCanonicalSchedule(
      secondSchedule,
    );

  const talkIds =
    new Set<string>([
      ...first.keys(),
      ...second.keys(),
    ]);

  let distance =
    0;

  for (
    const talkId of
    talkIds
  ) {
    if (
      first.get(
        talkId,
      ) !==
      second.get(
        talkId,
      )
    ) {
      distance +=
        1;
    }
  }

  return distance;
}

function collectStateObservations(
  events:
    StudyEvent[],
): StateObservation[] {
  const observations:
    StateObservation[] =
      [];

  for (
    const event of
    events
  ) {
    const stateHash =
      eventString(
        event,
        "stateHashAfter",
      );

    const schedule =
      eventString(
        event,
        "scheduleAfter",
      );

    if (
      stateHash.length ===
        0 ||
      schedule.length ===
        0
    ) {
      continue;
    }

    const observation:
      StateObservation = {
        elapsedMs:
          event.elapsedMs,

        stateHash,

        schedule,

        structuralSignature:
          eventString(
            event,
            "structuralSignatureAfter",
          ) ||
          eventString(
            event,
            "structuralSignature",
          ),

        macroStructureSignature:
          eventString(
            event,
            "macroStructureSignatureAfter",
            "macroStructureSignatureAfter",
          ) ||
          eventString(
            event,
            "macroStructureSignature",
            "macroStructureSignature",
          ) ||
          eventString(
            event,
            "roomCompositionSignatureAfter",
            "roomCompositionSignatureAfter",
          ) ||
          eventString(
            event,
            "roomCompositionSignature",
            "roomCompositionSignature",
          ),

        roomCompositionSignature:
          eventString(
            event,
            "roomCompositionSignatureAfter",
            "roomCompositionSignatureAfter",
          ) ||
          eventString(
            event,
            "roomCompositionSignature",
            "roomCompositionSignature",
          ),

        hammingDistanceFromAI:
          eventNumber(
            event,
            "hammingDistanceFromAIAfter",
          ) ??
          eventNumber(
            event,
            "hammingDistanceFromAI",
          ),

        insideAIFamily:
          eventBoolean(
            event,
            "insideAIFamilyAfter",
          ),
      };

    const previous =
      observations[
        observations.length -
          1
      ];

    if (
      previous?.stateHash ===
      observation.stateHash
    ) {
      continue;
    }

    observations.push(
      observation,
    );
  }

  return observations;
}

function getUniqueStateObservations(
  observations:
    StateObservation[],
): StateObservation[] {
  const unique =
    new Map<
      string,
      StateObservation
    >();

  for (
    const observation of
    observations
  ) {
    if (
      !unique.has(
        observation.stateHash,
      )
    ) {
      unique.set(
        observation.stateHash,
        observation,
      );
    }
  }

  return Array.from(
    unique.values(),
  );
}

function calculateMeanPairwiseStateDistance(
  observations:
    StateObservation[],
): number | null {
  if (
    observations.length <
    2
  ) {
    return 0;
  }

  const distances:
    number[] =
      [];

  for (
    let firstIndex =
      0;
    firstIndex <
      observations.length -
        1;
    firstIndex +=
      1
  ) {
    for (
      let secondIndex =
        firstIndex +
        1;
      secondIndex <
        observations.length;
      secondIndex +=
        1
    ) {
      distances.push(
        calculateScheduleHammingDistance(
          observations[
            firstIndex
          ].schedule,
          observations[
            secondIndex
          ].schedule,
        ),
      );
    }
  }

  return calculateMean(
    distances,
  );
}

function calculateTimeInsideAIFamily(
  observations:
    StateObservation[],

  trialEndElapsedMs:
    number,
): {
  timeInsideMs:
    number;

  timeOutsideMs:
    number;

  proportionInside:
    number | null;
} {
  let timeInsideMs =
    0;

  let timeOutsideMs =
    0;

  for (
    let index =
      0;
    index <
      observations.length;
    index +=
      1
  ) {
    const current =
      observations[
        index
      ];

    const nextElapsedMs =
      observations[
        index +
          1
      ]?.elapsedMs ??
      trialEndElapsedMs;

    const duration =
      Math.max(
        0,
        nextElapsedMs -
          current.elapsedMs,
      );

    if (
      current.insideAIFamily ===
      true
    ) {
      timeInsideMs +=
        duration;
    } else if (
      current.insideAIFamily ===
      false
    ) {
      timeOutsideMs +=
        duration;
    }
  }

  const classifiedTime =
    timeInsideMs +
    timeOutsideMs;

  return {
    timeInsideMs,

    timeOutsideMs,

    proportionInside:
      classifiedTime >
      0
        ? timeInsideMs /
          classifiedTime
        : null,
  };
}

function getViolationCount(
  event:
    StudyEvent | undefined,
): number | null {
  return eventNumber(
    event,
    "violationCount",
    "violationCount",
  );
}

function getConstraintViolationFeedbackAnchor(
  events:
    StudyEvent[],
): StudyEvent | undefined {
  const trialStartWithViolation =
    events.find(
      (event) =>
        event.eventType ===
          "trial_start" &&
        (
          getViolationCount(
            event,
          ) ??
          0
        ) >
          0,
    );

  if (
    trialStartWithViolation
  ) {
    return trialStartWithViolation;
  }

  return events.find(
    (event) =>
      (
        getViolationCount(
          event,
        ) ??
        0
      ) >
        0,
  );
}

function isPaperAlignedSalvageEdit(
  event:
    StudyEvent,

  anchorEvent:
    StudyEvent | undefined,
): boolean | null {
  if (
    !anchorEvent ||
    event.eventIndex <=
      anchorEvent.eventIndex
  ) {
    return null;
  }

  return (
    event.insideAIFamilyBefore ===
      true &&
    event.insideAIFamilyAfter ===
      true
  );
}

function buildAcceptedEditAnnotations(
  sortedEvents:
    StudyEvent[],

  anchorEvent:
    StudyEvent | undefined,
): Map<
  string,
  AcceptedEditAnnotation
> {
  const annotations =
    new Map<
      string,
      AcceptedEditAnnotation
    >();

  let acceptedEditIndex =
    0;

  let salvageRunIndex =
    0;

  let salvageRunPosition =
    0;

  let previousEditPreservedMacroStructure =
    false;

  for (
    const event of
    sortedEvents
  ) {
    if (
      !isAcceptedEdit(
        event,
      )
    ) {
      continue;
    }

    acceptedEditIndex +=
      1;

    const salvageMacroStructurePreserved =
      isPaperAlignedSalvageEdit(
        event,
        anchorEvent,
      );

    if (
      salvageMacroStructurePreserved ===
      true
    ) {
      if (
        !previousEditPreservedMacroStructure
      ) {
        salvageRunIndex +=
          1;

        salvageRunPosition =
          0;
      }

      salvageRunPosition +=
        1;

      previousEditPreservedMacroStructure =
        true;
    } else {
      salvageRunPosition =
        0;

      previousEditPreservedMacroStructure =
        false;
    }

    annotations.set(
      event.eventId,
      {
        acceptedEditIndex,

        cumulativeAcceptedEditsBefore:
          acceptedEditIndex -
          1,

        cumulativeAcceptedEditsAfter:
          acceptedEditIndex,

        salvageMacroStructurePreserved,

        salvageRunIndex:
          salvageMacroStructurePreserved ===
            true
            ? salvageRunIndex
            : null,

        salvageRunPosition:
          salvageMacroStructurePreserved ===
            true
            ? salvageRunPosition
            : null,
      },
    );
  }

  return annotations;
}

function calculateSalvageRuns(
  acceptedEdits:
    StudyEvent[],

  anchorEvent:
    StudyEvent | undefined,
): SalvageRun[] {
  const runs:
    SalvageRun[] = [];

  let currentRun:
    SalvageRun | null =
      null;

  for (
    let index =
      0;

    index <
      acceptedEdits.length;

    index +=
      1
  ) {
    const event =
      acceptedEdits[
        index
      ];

    const preservesMacroStructure =
      isPaperAlignedSalvageEdit(
        event,
        anchorEvent,
      ) ===
      true;

    if (
      preservesMacroStructure
    ) {
      if (
        !currentRun
      ) {
        currentRun = {
          runIndex:
            runs.length +
            1,

          length:
            1,

          startEvent:
            event,

          endEvent:
            event,

          startAcceptedEditIndex:
            index +
            1,

          endAcceptedEditIndex:
            index +
            1,
        };
      } else {
        currentRun.length +=
          1;

        currentRun.endEvent =
          event;

        currentRun.endAcceptedEditIndex =
          index +
          1;
      }

      continue;
    }

    if (
      currentRun
    ) {
      runs.push(
        currentRun,
      );

      currentRun =
        null;
    }
  }

  if (
    currentRun
  ) {
    runs.push(
      currentRun,
    );
  }

  return runs;
}

function getLongestSalvageRun(
  runs:
    SalvageRun[],
): SalvageRun | undefined {
  return runs.reduce<
    SalvageRun | undefined
  >(
    (
      longest,
      run,
    ) =>
      !longest ||
      run.length >
        longest.length
        ? run
        : longest,
    undefined,
  );
}

function findFirstPermanentAIFamilyExit(
  edits:
    StudyEvent[],
): StudyEvent | undefined {
  for (
    let index =
      0;
    index <
      edits.length;
    index +=
      1
  ) {
    const event =
      edits[
        index
      ];

    if (
      eventBoolean(
        event,
        "insideAIFamilyAfter",
      ) !==
      false
    ) {
      continue;
    }

    const laterReentry =
      edits
        .slice(
          index +
            1,
        )
        .some(
          (laterEvent) =>
            eventBoolean(
              laterEvent,
              "insideAIFamilyAfter",
            ) ===
            true,
        );

    if (
      !laterReentry
    ) {
      return event;
    }
  }

  return undefined;
}

export function buildTrialEventRows(
  events:
    StudyEvent[],
): TrialMetricRow[] {
  const sortedEvents =
    sortEvents(
      events,
    );

  const probeShownEvent =
    getFirstEvent(
      sortedEvents,
      "probe_shown",
    );

  const probeId =
    eventString(
      probeShownEvent,
      "probeId",
      "probeId",
    );

  const probeVersion =
    eventString(
      probeShownEvent,
      "probeVersion",
      "probeVersion",
    );

  const affectedRoom =
    eventString(
      probeShownEvent,
      "affectedRoom",
      "affectedRoom",
    ) ||
    eventString(
      probeShownEvent,
      "affectedResource",
      "affectedResource",
    );

  const requiredProjectorRoom =
    eventString(
      probeShownEvent,
      "requiredProjectorRoom",
      "requiredProjectorRoom",
    ) ||
    eventString(
      probeShownEvent,
      "requiredEquipmentResource",
      "requiredEquipmentResource",
    );

  const requiredTalkIds =
    firstDefined(
      readEventValue(
        probeShownEvent,
        "requiredTalkIds",
      ),

      readMetadataValue(
        probeShownEvent,
        "requiredTalkIds",
      ),

      readEventValue(
        probeShownEvent,
        "requiredItemIds",
      ),

      readMetadataValue(
        probeShownEvent,
        "requiredItemIds",
      ),
    );

  const probeShownAtIso =
    probeShownEvent?.timestampIso ??
    "";

  const violationFeedbackAnchor =
    getConstraintViolationFeedbackAnchor(
      sortedEvents,
    );

  const acceptedEditAnnotations =
    buildAcceptedEditAnnotations(
      sortedEvents,
      violationFeedbackAnchor,
    );

  return sortedEvents.map(
    (event) => {
      const acceptedEditAnnotation =
        acceptedEditAnnotations.get(
          event.eventId,
        );

      const taskId = resolveTaskId(
        event.taskId,
        readMetadataValue(
          event,
          "taskId",
        ),
      );

      const innerTaskNumber =
        getInnerTaskNumber(
          event.trialNumber,
        );

      const outerTaskNumber =
        getOuterTaskNumber(taskId);

      const globalTrialNumber =
        getGlobalTrialNumber(
          taskId,
          event.trialNumber,
        );

      const compositeTrialId =
        event.trialId ||
        getCompositeTrialId(
          taskId,
          event.condition,
          event.trialNumber,
        );

      return normalizeTrialMetricRow({
        participant_id:
          event.participantId,
        participant_token:
          event.participantToken ??
          "",
      session_id:
        event.sessionId,
      trial_id:
        compositeTrialId,
      composite_trial_id:
        compositeTrialId,
      trial_number:
        event.trialNumber,
      inner_task_number:
        innerTaskNumber,
      outer_task_number:
        outerTaskNumber,
      global_option_number:
        event.globalOptionNumber ??
        globalTrialNumber,
      global_trial_number:
        event.globalTrialNumber ??
        globalTrialNumber,
      trial_order:
        event.trialOrder,
      trial_index:
        event.trialIndex ??
        null,
      condition:
        event.condition,
      condition_order:
        event.conditionOrder,
      is_first_trial:
        event.isFirstTrial,
      probe_exposure_number:
        event.probeExposureNumber,
      probe_naive:
        event.probeNaive,
      task_id:
        taskId,
      skin:
        event.skin ??
        taskId,
      task_instance_version:
        event.taskInstanceVersion ??
        "",
      app_version:
        event.appVersion ??
        "",
      build_hash:
        event.buildHash ??
        "",
      event_index:
        event.eventIndex,
      event_id:
        event.eventId,
      event_type:
        event.eventType,
      phase:
        event.phase,
      timestamp_iso:
        event.timestampIso,
        elapsed_ms:
          event.elapsedMs,
        t_ms:
          event.tMs ??
          null,
        accepted_edit_index:
          acceptedEditAnnotation
            ?.acceptedEditIndex ??
          null,
        cumulative_accepted_edits_before:
          acceptedEditAnnotation
            ?.cumulativeAcceptedEditsBefore ??
          null,
        cumulative_accepted_edits_after:
          acceptedEditAnnotation
            ?.cumulativeAcceptedEditsAfter ??
          null,
        item_id:
          event.itemId ??
          event.talkId ??
          "",
        displaced_item_id:
          event.displacedItemId ??
          event.displacedTalkId ??
          "",
        talk_id:
          event.talkId ??
          event.itemId ??
          "",
        displaced_talk_id:
          event.displacedTalkId ??
          event.displacedItemId ??
          "",
      from_resource:
        event.fromResource ??
        event.fromRoom ??
        "",
      from_period:
        event.fromPeriod ??
        event.fromSlot ??
        null,
      to_resource:
        event.toResource ??
        event.toRoom ??
        "",
      to_period:
        event.toPeriod ??
        event.toSlot ??
        null,
      from_room:
        event.fromRoom ??
        "",
      from_slot:
        event.fromSlot ??
        null,
      to_room:
        event.toRoom ??
        "",
      to_slot:
        event.toSlot ??
        null,
      source:
        event.source ??
        "",
      action:
        event.action ??
        "",
      success:
        event.success ??
        null,
      illegal_reason:
        event.illegalReason ??
        "",
      drag_duration_ms:
        event.dragDurationMs ??
        null,
      probe_latency_ms:
        toNonNegativeNumber(
          event.probeLatencyMs ??
          null,
        ),
      schedule_before:
        event.scheduleBefore ??
        "",
      schedule_after:
        event.scheduleAfter ??
        "",
      state_hash_before:
        event.stateHashBefore ??
        "",
      state_hash_after:
        event.stateHashAfter ??
        "",
      structural_signature_before:
        event.structuralSignatureBefore ??
        "",
      structural_signature_after:
        event.structuralSignatureAfter ??
        "",
      macro_structure_signature_before:
        eventString(
          event,
          "macroStructureSignatureBefore",
          "previousMacroStructureSignature",
        ),
      macro_structure_signature_after:
        eventString(
          event,
          "macroStructureSignatureAfter",
          "macroStructureSignature",
        ),
      room_composition_signature_before:
        eventString(
          event,
          "roomCompositionSignatureBefore",
          "previousRoomCompositionSignature",
        ),
      room_composition_signature_after:
        eventString(
          event,
          "roomCompositionSignatureAfter",
          "roomCompositionSignature",
        ),
      resource_composition_signature_before:
        eventString(
          event,
          "resourceCompositionSignatureBefore",
          "resourceCompositionSignatureBefore",
        ) ||
        eventString(
          event,
          "roomCompositionSignatureBefore",
          "previousRoomCompositionSignature",
        ),
      resource_composition_signature_after:
        eventString(
          event,
          "resourceCompositionSignatureAfter",
          "resourceCompositionSignatureAfter",
        ) ||
        eventString(
          event,
          "roomCompositionSignatureAfter",
          "roomCompositionSignature",
        ),
      state_hash_definition:
        STATE_HASH_DEFINITION_BY_TASK[
          taskId
        ],
      structural_signature_definition:
        STRUCTURAL_SIGNATURE_DEFINITION_BY_TASK[
          taskId
        ],
      macro_structure_definition:
        eventString(
          event,
          "macroStructureDefinition",
          "macroStructureDefinition",
        ) ||
        MACRO_STRUCTURE_DEFINITION_BY_TASK[
          taskId
        ],
      score_before:
        event.scoreBefore ??
        null,
      score_after:
        event.scoreAfter ??
        null,
      score_delta:
        event.scoreDelta ??
        null,
      score_percentage_before:
        toNumberValue(
          readMetadataValue(
            event,
            "previousScorePercentage",
          ),
        ),
      score_percentage_after:
        toNumberValue(
          readMetadataValue(
            event,
            "scorePercentage",
          ),
        ),
      speaker_conflicts_before:
        event.speakerConflictsBefore ??
        event.actorConflictsBefore ??
        null,
      speaker_conflicts_after:
        event.speakerConflictsAfter ??
        event.actorConflictsAfter ??
        null,
      actor_conflicts_before:
        event.actorConflictsBefore ??
        event.speakerConflictsBefore ??
        null,
      actor_conflicts_after:
        event.actorConflictsAfter ??
        event.speakerConflictsAfter ??
        null,
      hamming_distance_from_ai_before:
        event.hammingDistanceFromAIBefore ??
        null,
      hamming_distance_from_ai_after:
        event.hammingDistanceFromAIAfter ??
        event.hammingDistanceFromAI ??
        null,
      distance_to_best_post_probe_before:
        toNumberValue(
          readMetadataValue(
            event,
            "previousDistanceToBestPostProbeSolution",
          ),
        ),
      distance_to_best_post_probe_after:
        toNumberValue(
          readMetadataValue(
            event,
            "distanceToBestPostProbeSolution",
          ),
        ),
      inside_ai_family_before:
        event.insideAIFamilyBefore ??
        null,
      inside_ai_family_after:
        event.insideAIFamilyAfter ??
        null,
      ai_family_exit:
        toBooleanValue(
          readMetadataValue(
            event,
            "aiFamilyExit",
          ),
        ),
      ai_family_reentry:
        toBooleanValue(
          readMetadataValue(
            event,
            "aiFamilyReentry",
          ),
        ),
      state_previously_visited:
        event.statePreviouslyVisited ??
        null,
      visit_count_before:
        toNumberValue(
          readMetadataValue(
            event,
            "visitCountBefore",
          ),
        ),
      visit_count_after:
        toNumberValue(
          readMetadataValue(
            event,
            "visitCountAfter",
          ),
        ),
      immediate_reversal:
        event.isImmediateReversal ??
        null,
      backtracking:
        event.isBacktracking ??
        null,
      edit_category:
        event.editCategory ??
        "",
      theoretical_edit_category:
        eventString(
          event,
          "theoreticalEditCategory",
          "theoreticalEditCategory",
        ),
      theoretical_edit_taxonomy_version:
        eventString(
          event,
          "theoreticalEditTaxonomyVersion",
          "theoreticalEditTaxonomyVersion",
        ) ||
        THEORETICAL_EDIT_TAXONOMY_VERSION_BY_TASK[
          taskId
        ],
      changed_talk_ids:
        serializeValue(
          readMetadataValue(
            event,
            "changedTalkIds",
          ),
        ),
        salvage_counting_anchor:
          violationFeedbackAnchor
            ?.eventId ===
          event.eventId,
        salvage_counting_anchor_elapsed_ms:
          violationFeedbackAnchor
            ?.elapsedMs ??
          null,
        salvage_counting_anchor_reason:
          violationFeedbackAnchor
            ?.eventId ===
          event.eventId
            ? getSalvageCountingAnchorReason(
                violationFeedbackAnchor,
              )
            : null,
        salvage_macro_structure_preserved:
          acceptedEditAnnotation
            ?.salvageMacroStructurePreserved ??
          null,
        salvage_run_index:
          acceptedEditAnnotation
            ?.salvageRunIndex ??
          null,
        salvage_run_position:
          acceptedEditAnnotation
            ?.salvageRunPosition ??
          null,
        salvage_attempt:
          acceptedEditAnnotation
            ?.salvageMacroStructurePreserved ??
          null,
      consecutive_salvage_attempt_count:
        toNumberValue(
          readMetadataValue(
            event,
            "consecutiveSalvageAttemptCount",
          ),
        ),
      repeated_salvage_attempt:
        toBooleanValue(
          readMetadataValue(
            event,
            "repeatedSalvageAttempt",
          ),
        ),
      non_improving_edit:
        event.isNonImprovingEdit ??
        null,
      plateau_edit:
        event.isPlateauEdit ??
        null,
      score_decreasing_edit:
        toBooleanValue(
          readMetadataValue(
            event,
            "isScoreDecreasingEdit",
          ),
        ),
        destructive_edit:
          isAcceptedEdit(
            event,
          )
            ? (
                event.strategySwitchTriggered ===
                  true ||
                event.moatCrossed ===
                  true
              )
            : null,
        destructive_edit_definition:
          "first_moat_crossing_hamming_distance_greater_than_half",
        structural_departure_edit:
          event.isDestructiveEdit ??
          null,
        structural_departure_magnitude:
          toNumberValue(
            readMetadataValue(
              event,
              "destructiveEditMagnitude",
            ),
          ),
        destructive_edit_magnitude:
          toNumberValue(
            readMetadataValue(
              event,
              "destructiveEditMagnitude",
            ),
          ),
        structural_departure:
          toBooleanValue(
            readMetadataValue(
              event,
              "structuralDeparture",
            ),
          ),
      transition_id:
        event.transitionId ??
        "",
      optimal_destructive_transition:
        event.isOptimalDestructiveTransition ??
        null,
      moat_crossed:
        event.moatCrossed ??
        null,
      strategy_switch_triggered:
        event.strategySwitchTriggered ??
        null,
      strategy_switch_latency_from_probe_ms:
        (
          event.strategySwitchTriggered ===
            true ||
          event.moatCrossed ===
            true
        )
          ? getElapsedDifferenceFromReference(
              event,
              probeShownEvent,
            )
          : null,
      hamming_distance_at_strategy_switch:
        toNumberValue(
          readMetadataValue(
            event,
            "hammingDistanceAtStrategySwitch",
          ),
        ),
      probe_id:
        eventString(
          event,
          "probeId",
          "probeId",
        ) ||
        probeId,
      probe_version:
        eventString(
          event,
          "probeVersion",
          "probeVersion",
        ) ||
        probeVersion,
      probe_shown_at_iso:
        probeShownAtIso,
      probe_shown_elapsed_ms:
        probeShownEvent?.elapsedMs ??
        null,
      acknowledgement_latency_ms:
        toNonNegativeNumber(
          eventNumber(
            event,
            "acknowledgementLatencyMs",
            "acknowledgementLatencyMs",
          ) ??
          (
            (
              event.eventType ===
                "probe_ack" ||
              event.eventType ===
                "probe_acknowledged"
            )
              ? event.probeLatencyMs ??
                getElapsedDifference(
                  event,
                  probeShownEvent,
                )
              : null
          ),
        ),
      affected_resource:
        eventString(
          event,
          "affectedResource",
          "affectedResource",
        ) ||
        eventString(
          event,
          "affectedRoom",
          "affectedRoom",
        ) ||
        affectedRoom,
      affected_room:
        eventString(
          event,
          "affectedRoom",
          "affectedRoom",
        ) ||
        eventString(
          event,
          "affectedResource",
          "affectedResource",
        ) ||
        affectedRoom,
      required_equipment_resource:
        eventString(
          event,
          "requiredEquipmentResource",
          "requiredEquipmentResource",
        ) ||
        eventString(
          event,
          "requiredProjectorRoom",
          "requiredProjectorRoom",
        ) ||
        requiredProjectorRoom,
      required_projector_room:
        eventString(
          event,
          "requiredProjectorRoom",
          "requiredProjectorRoom",
        ) ||
        requiredProjectorRoom,
      required_item_ids_json:
        serializeValue(
          firstDefined(
            readEventValue(
              event,
              "requiredItemIds",
            ),

            readMetadataValue(
              event,
              "requiredItemIds",
            ),

            readEventValue(
              event,
              "requiredTalkIds",
            ),

            readMetadataValue(
              event,
              "requiredTalkIds",
            ),

            requiredTalkIds,
          ),
        ),
      required_talk_ids_json:
        serializeValue(
          firstDefined(
            readEventValue(
              event,
              "requiredTalkIds",
            ),

            readMetadataValue(
              event,
              "requiredTalkIds",
            ),

            readEventValue(
              event,
              "requiredItemIds",
            ),

            readMetadataValue(
              event,
              "requiredItemIds",
            ),

            requiredTalkIds,
          ),
        ),
      probe_visible:
        event.probeVisible ??
        null,
      probe_acknowledged:
        event.probeAcknowledged ??
        null,
      probe_display_mode:
        event.probeDisplayMode ??
        "",
      probe_acknowledgment_source:
        event.probeAcknowledgmentSource ??
        "",
      integration_consistent_edit:
        event.integrationConsistentEdit ??
        null,
      probe_integration_detected:
        event.probeIntegrationDetected ??
        null,
      detection_miss:
        event.detectionMiss ??
        null,
      integration_miss:
        event.integrationMiss ??
        null,
      detection_without_integration:
        event.detectionWithoutIntegration ??
        null,
      first_probe_integration:
        toBooleanValue(
          readMetadataValue(
            event,
            "firstProbeIntegration",
          ),
        ),
      latency_from_probe_ms:
        toNonNegativeNumber(
          eventNumber(
            event,
            "latencyFromProbeMs",
            "latencyFromProbeMs",
          ),
        ),
      post_probe_edit_index:
        toNumberValue(
          readMetadataValue(
            event,
            "postProbeEditIndex",
          ),
        ),
      first_post_probe_edit:
        toBooleanValue(
          readMetadataValue(
            event,
            "isFirstPostProbeEdit",
          ),
        ),
      post_probe_edits_before_integration:
        toNumberValue(
          readMetadataValue(
            event,
            "postProbeEditsBeforeIntegration",
          ),
        ),
      post_probe_feasible:
        event.postProbeFeasible ??
        null,
      post_probe_feasible_before:
        event.postProbeFeasibleBefore ??
        null,
      post_probe_feasible_after:
        event.postProbeFeasibleAfter ??
        null,
      unresolved_demo_talk_ids_json:
        serializeValue(
          event.unresolvedDemoTalkIds ??
          event.unresolvedRequiredItemIds,
        ),
      unresolved_demo_talk_ids_before_json:
        serializeValue(
          event.unresolvedDemoTalkIdsBefore ??
          event.unresolvedRequiredItemIdsBefore,
        ),
      unresolved_demo_talk_ids_after_json:
        serializeValue(
          event.unresolvedDemoTalkIdsAfter ??
          event.unresolvedRequiredItemIdsAfter,
        ),
      unresolved_required_item_ids_json:
        serializeValue(
          event.unresolvedRequiredItemIds ??
          event.unresolvedDemoTalkIds,
        ),
      unresolved_required_item_ids_before_json:
        serializeValue(
          event.unresolvedRequiredItemIdsBefore ??
          event.unresolvedDemoTalkIdsBefore,
        ),
      unresolved_required_item_ids_after_json:
        serializeValue(
          event.unresolvedRequiredItemIdsAfter ??
          event.unresolvedDemoTalkIdsAfter,
        ),
      room_a_demo_count:
        toNumberValue(
          readMetadataValue(
            event,
            "roomADemoCount",
          ),
        ),
      room_a_non_demo_count:
        toNumberValue(
          readMetadataValue(
            event,
            "roomANonDemoCount",
          ),
        ),
      room_a_exact_demo_set:
        toBooleanValue(
          readMetadataValue(
            event,
            "roomAContainsExactDemoSet",
          ),
        ),
      complete_assignment:
        toBooleanValue(
          readMetadataValue(
            event,
            "completeAssignment",
          ),
        ),
      structurally_legal:
        toBooleanValue(
          readMetadataValue(
            event,
            "structurallyLegal",
          ),
        ),
      resulting_violations_json:
        serializeValue(
          event.resultingViolations,
        ),
      violation_count:
        event.violationCount ??
        null,
      remaining_ms:
        event.remainingMs ??
        null,
      timer_warning_level:
        event.timerWarningLevel ??
        "",
      accepted:
        event.accepted ??
        null,
      trial_end_reason:
        event.trialEndReason ??
        "",
      rendered_text:
        event.renderedText ??
        "",
      message_id:
        event.messageId ??
        "",
      content_version:
        event.contentVersion ??
        "",
      probe_compliant:
        event.probeCompliant ??
        null,
        metadata_json:
          serializeValue(
            event.metadata,
          ),
        payload_json:
          serializeValue(
            event.payload,
          ),
      });
    },
  );
}

export function buildTrialSummaryRows({
  participantId,
  sessionId,
  trial,
  questionnaireResponse,
  events,
}: BuildTrialSummaryRowsInput): TrialMetricRow[] {
  const sortedEvents =
    sortEvents(
      events,
    );

  const acceptedEdits =
    sortedEvents.filter(
      isAcceptedEdit,
    );

  const violationFeedbackAnchor =
    getConstraintViolationFeedbackAnchor(
      sortedEvents,
    );

  const salvageRuns =
    calculateSalvageRuns(
      acceptedEdits,
      violationFeedbackAnchor,
    );

  const longestSalvageRun =
    getLongestSalvageRun(
      salvageRuns,
    );

  const salvageAttemptCount =
    salvageRuns.reduce(
      (
        total,
        run,
      ) =>
        total +
        run.length,
      0,
    );

  const legacySalvageAttemptFlagCount =
    countTrue(
      acceptedEdits,
      "isSalvageAttempt",
    );

  const trialStartEvent =
    getFirstEvent(
      sortedEvents,
      "trial_start",
    );

  const probeShownEvent =
    getFirstEvent(
      sortedEvents,
      "probe_shown",
    );

  const probeOpenedEvent =
    getFirstEvent(
      sortedEvents,
      "probe_notification_opened",
    );

  const probeAcknowledgedEvent =
    getFirstEvent(
      sortedEvents,
      "probe_ack",
    ) ??
    getFirstEvent(
      sortedEvents,
      "probe_acknowledged",
    );

  const probeDetectionEvent =
    getEarlierEvent(
      probeOpenedEvent,
      probeAcknowledgedEvent,
    );

  const questionnaireStartedEvent =
    getFirstEvent(
      sortedEvents,
      "questionnaire_started",
    );

  const questionnaireSubmittedEvent =
    getLastEvent(
      sortedEvents,
      "questionnaire_submitted",
    );

  const finalEvent =
    getFinalSubmissionEvent(
      sortedEvents,
    );

  const taskId = resolveTaskId(
    trial.taskId,
    finalEvent?.taskId,
    trialStartEvent?.taskId,
  );

  const taskScoring =
    TASK_SCORING_BY_ID[taskId];

  const taskBenchmarks =
    TASK_ANALYSIS_BENCHMARKS_BY_ID[
      taskId
    ];

  const innerTaskNumber =
    getInnerTaskNumber(
      trial.trialNumber,
    );

  const outerTaskNumber =
    getOuterTaskNumber(taskId);

  const globalOptionNumber =
    trial.globalOptionNumber ??
    trial.globalTrialNumber ??
    getGlobalTrialNumber(
      taskId,
      trial.trialNumber,
    );

  const globalTrialNumber =
    trial.globalTrialNumber ??
    globalOptionNumber;

  const compositeTrialId =
    finalEvent?.trialId ||
    trialStartEvent?.trialId ||
    getCompositeTrialId(
      taskId,
      trial.condition,
      trial.trialNumber,
    );

  const theoreticalMaximumScheduleScore =
    taskBenchmarks.theoreticalMaximumScore;

  const stateHashDefinition =
    STATE_HASH_DEFINITION_BY_TASK[
      taskId
    ];

  const structuralSignatureDefinition =
    STRUCTURAL_SIGNATURE_DEFINITION_BY_TASK[
      taskId
    ];

  const macroStructureDefinition =
    MACRO_STRUCTURE_DEFINITION_BY_TASK[
      taskId
    ];

  const theoreticalEditTaxonomyVersion =
    THEORETICAL_EDIT_TAXONOMY_VERSION_BY_TASK[
      taskId
    ];

  const trialStartElapsedMs =
    trialStartEvent?.elapsedMs ??
    0;

  const trialEndElapsedMs =
    finalEvent?.elapsedMs ??
    sortedEvents[
      sortedEvents.length -
        1
    ]?.elapsedMs ??
    0;

  const trialDurationMs =
    Math.max(
      0,
      trialEndElapsedMs -
        trialStartElapsedMs,
    );

  const stateObservations =
    collectStateObservations(
      sortedEvents,
    );

  const uniqueStateObservations =
    getUniqueStateObservations(
      stateObservations,
    );

  const uniqueStructuralSignatures =
    new Set(
      stateObservations
        .map(
          (observation) =>
            observation.structuralSignature,
        )
        .filter(
          Boolean,
        ),
    );

  const uniqueMacroStructures =
    new Set(
      stateObservations
        .map(
          (observation) =>
            observation.macroStructureSignature,
        )
        .filter(
          Boolean,
        ),
    );

  const uniqueRoomCompositions =
    new Set(
      stateObservations
        .map(
          (observation) =>
            observation.roomCompositionSignature,
        )
        .filter(
          Boolean,
        ),
    );

  const hammingValues =
    stateObservations
      .map(
        (observation) =>
          observation.hammingDistanceFromAI,
      )
      .filter(
        (
          value,
        ): value is number =>
          value !==
          null,
      );

  const transitionIds =
    acceptedEdits
      .map(
        (event) =>
          event.transitionId ??
          "",
      )
      .filter(
        Boolean,
      );

  const editCategories =
    acceptedEdits
      .map(
        (event) =>
          event.editCategory ??
          "",
      )
      .filter(
        Boolean,
      );

  const theoreticalEditCategories =
    acceptedEdits
      .map(
        (event) =>
          eventString(
            event,
            "theoreticalEditCategory",
            "theoreticalEditCategory",
          ),
      )
      .filter(
        Boolean,
      );

  const destructiveEditEvents =
    acceptedEdits.filter(
      (event) =>
        event.moatCrossed ===
        true,
    );

  const firstMoatCrossingEvent =
    destructiveEditEvents[
      0
    ];

  const firstStructuralDepartureEvent =
    acceptedEdits.find(
      (event) =>
        toBooleanValue(
          readMetadataValue(
            event,
            "structuralDeparture",
          ),
        ) ===
          true ||
        (
          event.insideAIFamilyBefore ===
            true &&
          event.insideAIFamilyAfter ===
            false
        ),
    );

  const firstDestructiveEditEvent =
    acceptedEdits.find(
      (event) =>
        event.isDestructiveEdit ===
        true,
    );

  const firstOptimalTransitionEvent =
    acceptedEdits.find(
      (event) =>
        event.isOptimalDestructiveTransition ===
        true,
    );

  const firstIntegrationEvent =
    acceptedEdits.find(
      (event) =>
        event.integrationConsistentEdit ===
          true ||
        event.probeIntegrationDetected ===
          true,
    );

  const postProbeEdits =
    probeShownEvent
      ? acceptedEdits.filter(
          (event) =>
            event.elapsedMs >=
            probeShownEvent.elapsedMs,
        )
      : [];

  const firstPostProbeEdit =
    postProbeEdits[
      0
    ];

  const postProbeEditsBeforeIntegration =
    firstIntegrationEvent
      ? postProbeEdits.filter(
          (event) =>
            event.elapsedMs <
            firstIntegrationEvent.elapsedMs,
        ).length
      : postProbeEdits.length;

  const permanentAIFamilyExit =
    findFirstPermanentAIFamilyExit(
      acceptedEdits,
    );

  const strategySwitchEvent =
    permanentAIFamilyExit;

  const familyTime =
    calculateTimeInsideAIFamily(
      stateObservations,
      trialEndElapsedMs,
    );

  const firstEnteredAIFamilyObservation =
    stateObservations.find(
      (observation) =>
        observation.insideAIFamily ===
        true,
    );

  const enteredAIFamilyOccurred =
    Boolean(
      firstEnteredAIFamilyObservation,
    );

  const enteredAIFamilyElapsedMs =
    firstEnteredAIFamilyObservation
      ? Math.max(
          0,
          firstEnteredAIFamilyObservation.elapsedMs -
            trialStartElapsedMs,
        )
      : null;

  const acceptedEditsInsideFamily =
    acceptedEdits.filter(
      (event) =>
        event.insideAIFamilyAfter ===
        true,
    );

  const acceptedEditsBeforeSwitch =
    strategySwitchEvent
      ? acceptedEdits.filter(
          (event) =>
            event.elapsedMs <
            strategySwitchEvent.elapsedMs,
        )
      : acceptedEdits;

  const acceptedEditsInsideFamilyBeforeSwitch =
    acceptedEditsBeforeSwitch.filter(
      (event) =>
        event.insideAIFamilyAfter ===
        true,
    );

  const firstScoreAfter =
    eventNumber(
      trialStartEvent,
      "scoreAfter",
    );

  const finalScore =
    eventNumber(
      finalEvent,
      "scoreAfter",
    ) ??
    toNumberValue(
      readMetadataValue(
        finalEvent,
        "finalScore",
      ),
    );

  const finalScorePercentageOfTheoreticalMaximum =
    toNumberValue(
      readMetadataValue(
        finalEvent,
        "finalScorePercentage",
      ),
    ) ??
    (
      finalScore !==
      null
        ? (
            finalScore /
            theoreticalMaximumScheduleScore
          ) *
          100
        : null
    );

  const finalPostProbeFeasible =
    eventBoolean(
      finalEvent,
      "postProbeFeasible",
      "postProbeFeasible",
    ) ??
    eventBoolean(
      finalEvent,
      "postProbeFeasibleAfter",
    );

  const finalUnresolvedDemoTalkIds =
    firstDefined(
      readEventValue(
        finalEvent,
        "unresolvedDemoTalkIds",
      ),

      readMetadataValue(
        finalEvent,
        "unresolvedDemoTalkIds",
      ),

      readEventValue(
        finalEvent,
        "unresolvedDemoTalkIdsAfter",
      ),

      readMetadataValue(
        finalEvent,
        "unresolvedDemoTalkIdsAfter",
      ),

      readEventValue(
        finalEvent,
        "unresolvedRequiredItemIds",
      ),

      readMetadataValue(
        finalEvent,
        "unresolvedRequiredItemIds",
      ),

      readEventValue(
        finalEvent,
        "unresolvedRequiredItemIdsAfter",
      ),

      readMetadataValue(
        finalEvent,
        "unresolvedRequiredItemIdsAfter",
      ),
    );

  const finalUnresolvedRequiredItemIds =
    firstDefined(
      readEventValue(
        finalEvent,
        "unresolvedRequiredItemIds",
      ),

      readMetadataValue(
        finalEvent,
        "unresolvedRequiredItemIds",
      ),

      readEventValue(
        finalEvent,
        "unresolvedRequiredItemIdsAfter",
      ),

      readMetadataValue(
        finalEvent,
        "unresolvedRequiredItemIdsAfter",
      ),

      finalUnresolvedDemoTalkIds,
    );

  const finalPlacements =
    firstDefined(
      readEventValue(
        finalEvent,
        "finalPlacements",
      ),

      readMetadataValue(
        finalEvent,
        "finalPlacements",
      ),

      readMetadataValue(
        finalEvent,
        "placements",
      ),
    );

  const finalScheduleHash =
    eventString(
      finalEvent,
      "stateHashAfter",
    ) ||
    eventString(
      finalEvent,
      "finalScheduleHash",
      "finalScheduleHash",
    );

  const finalViolationCount =
    eventNumber(
      finalEvent,
      "violationCount",
      "violationCount",
    );

  const finalSpeakerConflictCount =
    toNumberValue(
      firstDefined(
        readMetadataValue(
          finalEvent,
          "finalSpeakerConflictPairs",
        ),

        readMetadataValue(
          finalEvent,
          "finalActorConflictPairs",
        ),
      ),
    ) ??
    eventNumber(
      finalEvent,
      "speakerConflictsAfter",
    ) ??
    eventNumber(
      finalEvent,
      "actorConflictsAfter",
    );

  const finalCompleteAssignment =
    toBooleanValue(
      readMetadataValue(
        finalEvent,
        "completeAssignment",
      ),
    );

  const finalStructurallyLegal =
    toBooleanValue(
      readMetadataValue(
        finalEvent,
        "structurallyLegal",
      ),
    );

  const finalHammingDistance =
    eventNumber(
      finalEvent,
      "hammingDistanceFromAIAfter",
    ) ??
    eventNumber(
      finalEvent,
      "hammingDistanceFromAI",
    ) ??
    hammingValues[
      hammingValues.length -
        1
    ] ??
    null;

  const probeShown =
    Boolean(
      probeShownEvent,
    );

  const verifiedGlobalOptimumScore =
    getVerifiedGlobalOptimumScore(
      probeShown,
      taskId,
    );

  const verifiedGlobalOptimumProblemInstance =
    probeShown
      ? "post_probe"
      : "pre_probe";

  const finalFeasibilityDataComplete =
    finalCompleteAssignment !==
      null &&
    finalStructurallyLegal !==
      null &&
    finalSpeakerConflictCount !==
      null &&
    (
      !probeShown ||
      finalPostProbeFeasible !==
        null
    );

  const finalFullyFeasible =
    !finalFeasibilityDataComplete
      ? null
      : (
          finalCompleteAssignment ===
            true &&
          finalStructurallyLegal ===
            true &&
          finalSpeakerConflictCount ===
            0 &&
          (
            !probeShown ||
            finalPostProbeFeasible ===
              true
          )
        );

  const unresolvedDemoItemCount =
    getCollectionItemCount(
      finalUnresolvedDemoTalkIds,
    );

  const finalParetoNumeratorScore =
    finalScore ===
      null
      ? null
      : probeShown
        ? unresolvedDemoItemCount ===
            null
          ? null
          : finalScore -
            12 *
              unresolvedDemoItemCount
        : finalScore;

  const finalParetoEfficiencyProportion =
    finalParetoNumeratorScore ===
      null
      ? null
      : calculateParetoEfficiencyProportion(
          finalParetoNumeratorScore,
          probeShown,
          taskId,
        );

  const finalParetoEfficiencyPercentage =
    finalParetoNumeratorScore ===
      null
      ? null
      : calculateParetoEfficiencyPercentage(
          finalParetoNumeratorScore,
          probeShown,
          taskId,
        );

  const finalParetoEfficiencyFeasibleOnlyProportion =
    finalFullyFeasible ===
      true
      ? finalParetoEfficiencyProportion
      : null;

  const finalParetoEfficiencyFeasibleOnlyPercentage =
    finalFullyFeasible ===
      true
      ? finalParetoEfficiencyPercentage
      : null;

  const probeAcknowledged =
    probeShown
      ? (
          eventBoolean(
            finalEvent,
            "probeAcknowledged",
            "probeAcknowledged",
          ) ??
          Boolean(
            probeAcknowledgedEvent,
          )
        )
      : null;

  const probeIntegrated =
    probeShown
      ? (
          eventBoolean(
            finalEvent,
            "probeIntegrationDetected",
            "probeIntegrationDetected",
          ) ??
          Boolean(
            firstIntegrationEvent,
          )
        )
      : null;

  const detectionMiss =
    probeShown
      ? !Boolean(
          probeDetectionEvent,
        )
      : null;

  const integrationMiss =
    probeShown
      ? (
          eventBoolean(
            finalEvent,
            "integrationMiss",
            "integrationMiss",
          ) ??
          probeIntegrated ===
            false
        )
      : null;

  const detectionWithoutIntegration =
    probeShown
      ? (
          eventBoolean(
            finalEvent,
            "detectionWithoutIntegration",
            "detectionWithoutIntegration",
          ) ??
          (
            probeAcknowledged ===
              true &&
            probeIntegrated ===
              false
          )
        )
      : null;

  const initialVisibleViolationCount =
    getViolationCount(
      trialStartEvent,
    );

  const probeRecallCorrect =
    getProbeRecallCorrect(
      questionnaireResponse
        .probeRecall,
      taskId,
    );

  const recognitionChoice =
    questionnaireResponse
      .probeRecall
      .recognitionChoice ??
    "";

  const probeRecognitionCorrect =
    recognitionChoice.length >
      0
      ? getProbeRecognitionCorrect(
          questionnaireResponse
            .probeRecall,
          taskId,
        )
      : null;

  const probeMemoryClassification =
    recognitionChoice.length ===
      0
      ? ""
      : probeRecallCorrect
        ? "recalled"
        : probeRecognitionCorrect ===
            true
          ? "recognized_without_recall"
          : "not_recognized";

  const detectionEvidencePresent =
    probeShown
      ? (
          probeAcknowledged ===
            true ||
          probeRecallCorrect ||
          probeRecognitionCorrect ===
            true
        )
      : null;

  const probeDissociationProfile =
    !probeShown
      ? ""
      : probeIntegrated ===
          true
        ? "integrated"
        : detectionEvidencePresent ===
            true
          ? "detected_but_unintegrated"
          : "undetected";

  const strategySwitchOccurred =
    Boolean(
      strategySwitchEvent,
    );

  const strategySwitchElapsedMs =
    strategySwitchEvent
      ? Math.max(
          0,
          strategySwitchEvent.elapsedMs -
            trialStartElapsedMs,
        )
      : null;

  const strategySwitchEventObserved =
    strategySwitchOccurred;

  const strategySwitchRightCensored =
    !strategySwitchOccurred;

  const strategySwitchTimeOrCensorMs =
    strategySwitchElapsedMs ??
    trialDurationMs;

  const probeRiskWindowMs =
    probeShownEvent
      ? Math.max(
          0,
          trialEndElapsedMs -
            probeShownEvent.elapsedMs,
        )
      : null;

  const detectionLatencyMs =
    getElapsedDifferenceFromReference(
      probeDetectionEvent,
      probeShownEvent,
    );

  const probeAcknowledgementLatencyMs =
    getElapsedDifferenceFromReference(
      probeAcknowledgedEvent,
      probeShownEvent,
    );

  const detectionEventObserved =
    probeShown
      ? Boolean(
          probeDetectionEvent,
        )
      : null;

  const detectionRightCensored =
    probeShown
      ? !Boolean(
          probeDetectionEvent,
        )
      : null;

  const detectionTimeOrCensorMs =
    !probeShown
      ? null
      : detectionLatencyMs ??
        probeRiskWindowMs;

  const integrationLatencyMs =
    getElapsedDifferenceFromReference(
      firstIntegrationEvent,
      probeShownEvent,
    );

  const integrationEventObserved =
    probeShown
      ? Boolean(
          firstIntegrationEvent,
        )
      : null;

  const integrationRightCensored =
    probeShown
      ? !Boolean(
          firstIntegrationEvent,
        )
      : null;

  const integrationTimeOrCensorMs =
    !probeShown
      ? null
      : integrationLatencyMs ??
        probeRiskWindowMs;

  const initialAssignmentComplete =
    toBooleanValue(
      readMetadataValue(
        trialStartEvent,
        "initialCompleteAssignment",
      ),
    ) ===
    true;

  const firstCompleteAssignmentEvent =
    initialAssignmentComplete
      ? trialStartEvent
      : acceptedEdits.find(
          (event) =>
            eventBoolean(
              event,
              "completeAssignment",
              "completeAssignment",
            ) ===
            true,
        );

  const firstCompleteAssignmentElapsedMs =
    initialAssignmentComplete
      ? 0
      : firstCompleteAssignmentEvent
          ?.elapsedMs ??
        null;

  const constructionEditCount =
    initialAssignmentComplete
      ? 0
      : firstCompleteAssignmentEvent
          ? acceptedEdits.filter(
              (event) =>
                event.eventIndex <
                firstCompleteAssignmentEvent.eventIndex,
            ).length
          : acceptedEdits.length;

  const searchEditCount =
    acceptedEdits.length -
    constructionEditCount;

  if (
    constructionEditCount +
      searchEditCount !==
    acceptedEdits.length
  ) {
    throw new Error(
      "Construction and search edit counts must equal accepted edit count.",
    );
  }

  const idleDurationsMs =
    sortedEvents
      .filter(
        (event) =>
          event.eventType ===
          "idle",
      )
      .map(
        (event) =>
          eventNumber(
            event,
            "idleDurationMs",
            "idleDurationMs",
          ),
      )
      .filter(
        (
          duration,
        ): duration is number =>
          duration !==
            null &&
          duration >=
            0,
      );

  const totalIdleMs =
    idleDurationsMs.reduce(
      (
        total,
        duration,
      ) =>
        total +
        duration,
      0,
    );

  const longestIdleMs =
    idleDurationsMs.length >
      0
      ? Math.max(
          ...idleDurationsMs,
        )
      : 0;

  const strategySwitchPrecededProbe =
    strategySwitchEvent &&
    probeShownEvent
      ? strategySwitchEvent.elapsedMs <
        probeShownEvent.elapsedMs
      : null;

  const summaryRow:
    TrialMetricRow = {
      participant_id:
        participantId,
      participant_token:
        finalEvent?.participantToken ??
        trialStartEvent?.participantToken ??
        "",
      session_id:
        sessionId,
      trial_id:
        compositeTrialId,
      composite_trial_id:
        compositeTrialId,
      trial_number:
        trial.trialNumber,
      inner_task_number:
        innerTaskNumber,
      outer_task_number:
        outerTaskNumber,
      global_option_number:
        globalOptionNumber,
      global_trial_number:
        globalTrialNumber,
      trial_order:
        trial.trialOrder,
      task_id:
        taskId,
      condition:
        trial.condition,
      condition_order:
        trial.conditionOrder,
      participant_label:
        trial.participantLabel,
      is_first_trial:
        trial.isFirstTrial,
      probe_exposure_number:
        trial.probeExposureNumber,
      probe_naive:
        trial.probeNaive,
      trial_status:
        trial.status,
      trial_started_at_iso:
        trial.startedAtIso ??
        "",
      assistant_analysis_requested_at_iso:
        trial.assistantAnalysisRequestedAtIso ??
        "",
      assistant_analysis_started_at_iso:
        trial.assistantAnalysisStartedAtIso ??
        "",
      assistant_analysis_completed_at_iso:
        trial.assistantAnalysisCompletedAtIso ??
        "",
      assistant_recommendation_shown_at_iso:
        trial.assistantRecommendationShownAtIso ??
        "",
      timer_started_at_iso:
        trial.timerStartedAtIso ??
        "",
      probe_shown_at_iso:
        trial.probeShownAtIso ??
        probeShownEvent?.timestampIso ??
        "",
      probe_collapsed_at_iso:
        trial.probeCollapsedAtIso ??
        "",
      probe_acknowledged_at_iso:
        trial.probeAcknowledgedAtIso ??
        probeAcknowledgedEvent?.timestampIso ??
        "",
      trial_submitted_at_iso:
        trial.submittedAtIso ??
        finalEvent?.timestampIso ??
        "",
      trial_ended_at_iso:
        trial.trialEndedAtIso ??
        finalEvent?.timestampIso ??
        "",
      trial_end_reason:
        trial.trialEndReason ??
        finalEvent?.trialEndReason ??
        "",
      questionnaire_started_at_iso:
        questionnaireResponse.startedAtIso ??
        trial.questionnaireStartedAtIso ??
        questionnaireStartedEvent?.timestampIso ??
        "",
      questionnaire_submitted_at_iso:
        questionnaireResponse.submittedAtIso ??
        trial.questionnaireCompletedAtIso ??
        questionnaireSubmittedEvent?.timestampIso ??
        "",
      questionnaire_exported_at_iso:
        questionnaireResponse.exportedAtIso ??
        "",
      trial_duration_ms:
        trialDurationMs,
      event_count:
        sortedEvents.length,
      accepted_edit_count:
        acceptedEdits.length,
      edit_sequence_entropy_bits:
        calculateEntropy(
          theoreticalEditCategories,
        ),
      theoretical_edit_category_entropy_bits:
        calculateEntropy(
          theoreticalEditCategories,
        ),
      transition_id_entropy_bits:
        calculateEntropy(
          transitionIds,
        ),
      edit_category_entropy_bits:
        calculateEntropy(
          editCategories,
        ),
      room_based_edit_category_entropy_bits:
        calculateEntropy(
          editCategories,
        ),
      within_cluster_edit_count:
        theoreticalEditCategories.filter(
          (category) =>
            category ===
            "within_cluster",
        ).length,
      cross_cluster_edit_count:
        theoreticalEditCategories.filter(
          (category) =>
            category ===
            "cross_cluster",
        ).length,
      structure_breaking_edit_count:
        theoreticalEditCategories.filter(
          (category) =>
            category ===
            "structure_breaking",
        ).length,
      theoretical_edit_taxonomy_version:
        eventString(
          finalEvent,
          "theoreticalEditTaxonomyVersion",
          "theoreticalEditTaxonomyVersion",
        ) ||
        eventString(
          trialStartEvent,
          "theoreticalEditTaxonomyVersion",
          "theoreticalEditTaxonomyVersion",
        ) ||
        theoreticalEditTaxonomyVersion,
      visited_state_count:
        stateObservations.length,
      unique_states_visited:
        uniqueStateObservations.length,
      revisited_state_count:
        countTrue(
          acceptedEdits,
          "statePreviouslyVisited",
        ),
      unique_macro_structures:
        uniqueMacroStructures.size,
      unique_room_compositions:
        uniqueRoomCompositions.size,
      unique_structural_signatures:
        uniqueStructuralSignatures.size,
      exploration_breadth_signature:
        "macro_structure_signature",
      state_hash_definition:
        stateHashDefinition,
      structural_signature_definition:
        structuralSignatureDefinition,
      macro_structure_definition:
        eventString(
          finalEvent,
          "macroStructureDefinition",
          "macroStructureDefinition",
        ) ||
        eventString(
          trialStartEvent,
          "macroStructureDefinition",
          "macroStructureDefinition",
        ) ||
        macroStructureDefinition,
      mean_pairwise_state_hamming:
        calculateMeanPairwiseStateDistance(
          uniqueStateObservations,
        ),
      maximum_hamming_distance_from_ai:
        calculateMaximum(
          hammingValues,
        ),
      mean_hamming_distance_from_ai:
        calculateMean(
          hammingValues,
        ),
      final_hamming_distance_from_ai:
        finalHammingDistance,
      score_unit:
        taskScoring.scoreUnit,
      theoretical_maximum_score:
        theoreticalMaximumScheduleScore,
      verified_pre_probe_global_optimum_score:
        taskBenchmarks
          .verifiedPreProbeGlobalOptimumScore,
      verified_post_probe_global_optimum_score:
        taskBenchmarks
          .verifiedPostProbeGlobalOptimumScore,
      verified_global_optimum_score_for_trial:
        verifiedGlobalOptimumScore,
      verified_global_optimum_problem_instance:
        verifiedGlobalOptimumProblemInstance,
      pareto_efficiency_reference:
        taskBenchmarks
          .paretoEfficiencyReference,
      initial_score:
        firstScoreAfter,
      final_score:
        finalScore,
      final_score_maximum:
        theoreticalMaximumScheduleScore,
      final_score_percentage:
        finalScorePercentageOfTheoreticalMaximum,
      final_score_percentage_of_theoretical_maximum:
        finalScorePercentageOfTheoreticalMaximum,
      final_pareto_efficiency_proportion:
        finalParetoEfficiencyProportion,
      final_pareto_efficiency_percentage:
        finalParetoEfficiencyPercentage,
      final_pareto_efficiency_feasible_only_proportion:
        finalParetoEfficiencyFeasibleOnlyProportion,
      final_pareto_efficiency_feasible_only_percentage:
        finalParetoEfficiencyFeasibleOnlyPercentage,
      final_pareto_efficiency_interpretation_valid:
        finalFullyFeasible,
      score_change_from_initial:
        finalScore !==
          null &&
        firstScoreAfter !==
          null
          ? finalScore -
            firstScoreAfter
          : null,
      first_structural_departure_occurred:
        Boolean(
          firstStructuralDepartureEvent,
        ),
      first_structural_departure_elapsed_ms:
        firstStructuralDepartureEvent
          ? Math.max(
              0,
              firstStructuralDepartureEvent.elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      ai_family_exit_count:
        acceptedEdits.filter(
          (event) =>
            (
              event.insideAIFamilyBefore ===
                true &&
              event.insideAIFamilyAfter ===
                false
            ) ||
            toBooleanValue(
              readMetadataValue(
                event,
                "aiFamilyExit",
              ),
            ) ===
              true,
        ).length,
      ai_family_reentry_count:
        acceptedEdits.filter(
          (event) =>
            (
              event.insideAIFamilyBefore ===
                false &&
              event.insideAIFamilyAfter ===
                true
            ) ||
            toBooleanValue(
              readMetadataValue(
                event,
                "aiFamilyReentry",
              ),
            ) ===
              true,
        ).length,
      accepted_edits_inside_ai_family:
        acceptedEditsInsideFamily.length,
      accepted_edit_proportion_inside_ai_family:
        acceptedEdits.length >
        0
          ? acceptedEditsInsideFamily.length /
            acceptedEdits.length
          : null,
      accepted_edits_before_strategy_switch:
        strategySwitchOccurred
          ? acceptedEditsBeforeSwitch.length
          : null,
      accepted_edits_inside_ai_family_before_switch:
        acceptedEditsInsideFamilyBeforeSwitch.length,
      time_inside_ai_family_ms:
        familyTime.timeInsideMs,
      time_outside_ai_family_ms:
        familyTime.timeOutsideMs,
      time_proportion_inside_ai_family:
        familyTime.proportionInside,
      salvage_primary_dv:
        "maximum_consecutive_salvage_run",
      salvage_macro_structure_rule:
        "inside_ai_family_before_and_after",
      salvage_counting_anchor_event_type:
        violationFeedbackAnchor
          ?.eventType ??
        "",
      salvage_counting_anchor_event_id:
        violationFeedbackAnchor
          ?.eventId ??
        "",
      salvage_counting_anchor_elapsed_ms:
        violationFeedbackAnchor
          ?.elapsedMs ??
        null,
      salvage_counting_anchor_reason:
        getSalvageCountingAnchorReason(
          violationFeedbackAnchor,
        ),
      initial_visible_violation_count:
        initialVisibleViolationCount,
      salvage_attempt_count:
        violationFeedbackAnchor
          ? salvageAttemptCount
          : null,
      maximum_consecutive_salvage_run:
        violationFeedbackAnchor
          ? longestSalvageRun
              ?.length ??
            0
          : null,
      salvage_run_count:
        violationFeedbackAnchor
          ? salvageRuns.length
          : null,
      longest_salvage_run_start_elapsed_ms:
        longestSalvageRun
          ? Math.max(
              0,
              longestSalvageRun
                .startEvent
                .elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      longest_salvage_run_end_elapsed_ms:
        longestSalvageRun
          ? Math.max(
              0,
              longestSalvageRun
                .endEvent
                .elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      longest_salvage_run_duration_ms:
        longestSalvageRun
          ? Math.max(
              0,
              longestSalvageRun
                .endEvent
                .elapsedMs -
                longestSalvageRun
                  .startEvent
                  .elapsedMs,
            )
          : null,
      longest_salvage_run_start_accepted_edit_index:
        longestSalvageRun
          ?.startAcceptedEditIndex ??
        null,
      longest_salvage_run_end_accepted_edit_index:
        longestSalvageRun
          ?.endAcceptedEditIndex ??
        null,
      legacy_salvage_attempt_flag_count:
        legacySalvageAttemptFlagCount,
      repeated_salvage_attempt_count:
        acceptedEdits.filter(
          (event) =>
            toBooleanValue(
              readMetadataValue(
                event,
                "repeatedSalvageAttempt",
              ),
            ) ===
            true,
        ).length,
      repair_cycle_count:
        violationFeedbackAnchor
          ? salvageRuns.length
          : null,
      immediate_reversal_count:
        countTrue(
          acceptedEdits,
          "isImmediateReversal",
        ),
      backtracking_count:
        countTrue(
          acceptedEdits,
          "isBacktracking",
        ),
      non_improving_edit_count:
        countTrue(
          acceptedEdits,
          "isNonImprovingEdit",
        ),
      plateau_edit_count:
        countTrue(
          acceptedEdits,
          "isPlateauEdit",
        ),
      score_decreasing_edit_count:
        acceptedEdits.filter(
          (event) =>
            toBooleanValue(
              readMetadataValue(
                event,
                "isScoreDecreasingEdit",
              ),
            ) ===
              true ||
            (
              event.scoreDelta ??
              0
            ) <
              0,
        ).length,
      destructive_edit_definition:
        "count_all_moat_crossings_with_latency_to_first_hamming_distance_greater_than_half",
      destructive_edit_occurred:
        Boolean(
          firstMoatCrossingEvent,
        ),
      destructive_edit_count:
        destructiveEditEvents.length,
      destructive_edit_latency_ms:
        firstMoatCrossingEvent
          ? Math.max(
              0,
              firstMoatCrossingEvent.elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      destructive_edit_event_observed:
        Boolean(
          firstMoatCrossingEvent,
        ),
      destructive_edit_right_censored:
        !Boolean(
          firstMoatCrossingEvent,
        ),
      destructive_edit_time_or_censor_ms:
        firstMoatCrossingEvent
          ? Math.max(
              0,
              firstMoatCrossingEvent.elapsedMs -
                trialStartElapsedMs,
            )
          : trialDurationMs,
      structural_departure_edit_occurred:
        Boolean(
          firstStructuralDepartureEvent,
        ),
      structural_departure_edit_count:
        acceptedEdits.filter(
          (event) =>
            toBooleanValue(
              readMetadataValue(
                event,
                "structuralDeparture",
              ),
            ) ===
              true ||
            (
              event.insideAIFamilyBefore ===
                true &&
              event.insideAIFamilyAfter ===
                false
            ),
        ).length,
      first_structural_departure_latency_ms:
        firstStructuralDepartureEvent
          ? Math.max(
              0,
              firstStructuralDepartureEvent.elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      first_destructive_edit_magnitude:
        toNumberValue(
          readMetadataValue(
            firstDestructiveEditEvent,
            "destructiveEditMagnitude",
          ),
        ),
      maximum_destructive_edit_magnitude:
        calculateMaximum(
          acceptedEdits
            .map(
              (event) =>
                toNumberValue(
                  readMetadataValue(
                    event,
                    "destructiveEditMagnitude",
                  ),
                ),
            )
            .filter(
              (
                value,
              ): value is number =>
                value !==
                null,
            ),
        ),
      strategy_switch_occurred:
        strategySwitchOccurred,
      strategy_switch_elapsed_ms:
        strategySwitchElapsedMs,
      strategy_switch_event_observed:
        strategySwitchEventObserved,
      strategy_switch_right_censored:
        strategySwitchRightCensored,
      strategy_switch_time_or_censor_ms:
        strategySwitchTimeOrCensorMs,
      strategy_switch_latency_from_probe_ms:
        getElapsedDifferenceFromReference(
          strategySwitchEvent,
          probeShownEvent,
        ),
      hamming_distance_at_strategy_switch:
        eventNumber(
          strategySwitchEvent,
          "hammingDistanceFromAIAfter",
        ) ??
        eventNumber(
          strategySwitchEvent,
          "hammingDistanceFromAI",
        ),
      scrap_occurred:
        strategySwitchOccurred,
      scrap_latency_ms:
        strategySwitchElapsedMs,
      scrap_event_observed:
        strategySwitchEventObserved,
      scrap_right_censored:
        strategySwitchRightCensored,
      scrap_time_or_censor_ms:
        strategySwitchTimeOrCensorMs,
      permanent_ai_family_exit_occurred:
        Boolean(
          permanentAIFamilyExit,
        ),
      permanent_ai_family_exit_latency_ms:
        permanentAIFamilyExit
          ? Math.max(
              0,
              permanentAIFamilyExit.elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      scrap_latency_ms_first_permanent_ai_family_exit:
        permanentAIFamilyExit
          ? Math.max(
              0,
              permanentAIFamilyExit.elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      optimal_destructive_transition_executed:
        Boolean(
          firstOptimalTransitionEvent,
        ),
      optimal_destructive_transition_count:
        countTrue(
          acceptedEdits,
          "isOptimalDestructiveTransition",
        ),
      time_to_first_optimal_destructive_transition_ms:
        firstOptimalTransitionEvent
          ? Math.max(
              0,
              firstOptimalTransitionEvent.elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      probe_shown:
        probeShown,
      probe_shown_timestamp_iso:
        probeShownEvent?.timestampIso ??
        "",
      probe_opened:
        Boolean(
          probeOpenedEvent,
        ),
      probe_opened_timestamp_iso:
        probeOpenedEvent?.timestampIso ??
        "",
      probe_acknowledged:
        probeAcknowledged,
      probe_acknowledged_timestamp_iso:
        probeAcknowledgedEvent?.timestampIso ??
        "",
      probe_open_latency_ms:
        getElapsedDifferenceFromReference(
          probeOpenedEvent,
          probeShownEvent,
        ),
      probe_acknowledgement_latency_ms:
        probeAcknowledgementLatencyMs,
      detection_event_observed:
        detectionEventObserved,
      detection_right_censored:
        detectionRightCensored,
      detection_time_or_censor_ms:
        detectionTimeOrCensorMs,
      detection_miss:
        detectionMiss,
      detection_evidence_present:
        detectionEvidencePresent,
      first_post_probe_edit_timestamp_iso:
        firstPostProbeEdit?.timestampIso ??
        "",
      first_post_probe_edit_latency_ms:
        getElapsedDifferenceFromReference(
          firstPostProbeEdit,
          probeShownEvent,
        ),
      first_integration_consistent_edit_timestamp_iso:
        firstIntegrationEvent?.timestampIso ??
        "",
      first_integration_consistent_edit_latency_ms:
        integrationLatencyMs,
      integration_event_observed:
        integrationEventObserved,
      integration_right_censored:
        integrationRightCensored,
      integration_time_or_censor_ms:
        integrationTimeOrCensorMs,
      post_probe_risk_window_ms:
        probeRiskWindowMs,
      post_probe_edit_count:
        postProbeEdits.length,
      post_probe_edits_before_integration:
        postProbeEditsBeforeIntegration,
      probe_integrated:
        probeIntegrated,
      probe_integration_detected:
        probeIntegrated,
      integration_miss:
        integrationMiss,
      detection_without_integration:
        detectionWithoutIntegration,
      probe_dissociation_profile:
        probeDissociationProfile,
      final_inside_ai_family:
        eventBoolean(
          finalEvent,
          "insideAIFamilyAfter",
        ),
      final_speaker_conflict_count:
        finalSpeakerConflictCount,
      final_actor_conflict_count:
        finalSpeakerConflictCount,
      final_fully_feasible:
        finalFullyFeasible,
      final_distance_to_best_post_probe_solution:
        toNumberValue(
          readMetadataValue(
            finalEvent,
            "distanceToBestPostProbeSolution",
          ),
        ),
      final_room_a_demo_count:
        toNumberValue(
          readMetadataValue(
            finalEvent,
            "roomADemoCount",
          ),
        ),
      final_room_a_non_demo_count:
        toNumberValue(
          readMetadataValue(
            finalEvent,
            "roomANonDemoCount",
          ),
        ),
      final_room_a_exact_demo_set:
        toBooleanValue(
          readMetadataValue(
            finalEvent,
            "roomAContainsExactDemoSet",
          ),
        ),
      final_complete_assignment:
        finalCompleteAssignment,
      final_structurally_legal:
        finalStructurallyLegal,
      final_pre_probe_feasible:
        eventBoolean(
          finalEvent,
          "preProbeFeasible",
          "preProbeFeasible",
        ),
      final_semantic_probe_compliant:
        eventBoolean(
          finalEvent,
          "semanticProbeCompliant",
          "semanticProbeCompliant",
        ) ??
        toBooleanValue(
          readMetadataValue(
            finalEvent,
            "roomAContainsExactDemoSet",
          ),
        ),
      post_probe_feasible:
        finalPostProbeFeasible,
      final_post_probe_feasible:
        finalPostProbeFeasible,
      unresolved_demo_talk_ids_json:
        serializeValue(
          finalUnresolvedDemoTalkIds,
        ),
      unresolved_required_item_ids_json:
        serializeValue(
          finalUnresolvedRequiredItemIds,
        ),
      final_placements_json:
        serializeValue(
          finalPlacements,
        ),
      final_schedule_hash:
        finalScheduleHash,
      final_violation_count:
        finalViolationCount,
      rational_abandonment:
        finalFullyFeasible ===
          null
          ? null
          : strategySwitchOccurred &&
            finalFullyFeasible,
      initial_condition_loaded:
        toStringValue(
          readMetadataValue(
            trialStartEvent,
            "loadedCondition",
          ),
        ),
      correct_condition_loaded:
        toBooleanValue(
          readMetadataValue(
            trialStartEvent,
            "correctConditionLoaded",
          ),
        ),
      expected_initial_placement_count:
        toNumberValue(
          readMetadataValue(
            trialStartEvent,
            "expectedInitialPlacementCount",
          ),
        ),
      loaded_initial_placement_count:
        toNumberValue(
          readMetadataValue(
            trialStartEvent,
            "loadedInitialPlacementCount",
          ),
        ),
      expected_initial_schedule_hash:
        toStringValue(
          readMetadataValue(
            trialStartEvent,
            "expectedInitialScheduleHash",
          ),
        ),
      loaded_initial_schedule_hash:
        toStringValue(
          readMetadataValue(
            trialStartEvent,
            "loadedInitialScheduleHash",
          ),
        ),
      correct_initial_schedule_loaded:
        toBooleanValue(
          readMetadataValue(
            trialStartEvent,
            "correctInitialScheduleLoaded",
          ),
        ),
      trial_duration_seconds:
        toNumberValue(
          readMetadataValue(
            trialStartEvent,
            "trialDurationSeconds",
          ),
        ),
      ai_analysis_delay_ms:
        toNumberValue(
          readMetadataValue(
            trialStartEvent,
            "aiAnalysisDelayMs",
          ),
        ),
      probe_onset_seconds:
        toNumberValue(
          readMetadataValue(
            trialStartEvent,
            "probeOnsetSeconds",
          ),
        ),
      probe_collapse_seconds:
        toNumberValue(
          readMetadataValue(
            trialStartEvent,
            "probeCollapseSeconds",
          ),
        ),
      task_version:
        toStringValue(
          readMetadataValue(
            trialStartEvent,
            "taskVersion",
          ),
        ),
      ai_artifact_version:
        toStringValue(
          readMetadataValue(
            trialStartEvent,
            "aiArtifactVersion",
          ),
        ),
      ai_message_version:
        toStringValue(
          readMetadataValue(
            trialStartEvent,
            "aiMessageVersion",
          ),
        ),
      probe_version:
        toStringValue(
          readMetadataValue(
            trialStartEvent,
            "probeVersion",
          ),
        ),
      scoring_version:
        toStringValue(
          readMetadataValue(
            trialStartEvent,
            "scoringVersion",
          ),
        ),
      nasa_mental_demand:
        toNasaTlxCsvValue(
          questionnaireResponse.nasaTlx.mentalDemand,
        ),
      nasa_physical_demand:
        toNasaTlxCsvValue(
          questionnaireResponse.nasaTlx.physicalDemand,
        ),
      nasa_temporal_demand:
        toNasaTlxCsvValue(
          questionnaireResponse.nasaTlx.temporalDemand,
        ),
      nasa_performance:
        toNasaTlxCsvValue(
          questionnaireResponse.nasaTlx.performance,
        ),
      nasa_effort:
        toNasaTlxCsvValue(
          questionnaireResponse.nasaTlx.effort,
        ),
      nasa_frustration:
        toNasaTlxCsvValue(
          questionnaireResponse.nasaTlx.frustration,
        ),
      schedule_completeness_rating:
        toLikertCsvValue(
          questionnaireResponse.experienceRatings.scheduleCompleteness,
        ),
      ai_helpfulness_rating:
        toLikertCsvValue(
          questionnaireResponse.experienceRatings.aiHelpfulness,
        ),
      ai_competence_rating:
        toLikertCsvValue(
          questionnaireResponse.experienceRatings.aiCompetence,
        ),
      manipulation_recommendation_specificity:
        toLikertCsvValue(
          questionnaireResponse.manipulationCheck.recommendationSpecificity,
        ),
      manipulation_recommendation_detail:
        toLikertCsvValue(
          questionnaireResponse.manipulationCheck.recommendationDetail,
        ),
      manipulation_solution_concreteness:
        toLikertCsvValue(
          questionnaireResponse.manipulationCheck.solutionConcreteness,
        ),
      manipulation_solution_completeness:
        toLikertCsvValue(
          questionnaireResponse.manipulationCheck.solutionCompleteness,
        ),
      manipulation_direct_usability:
        toLikertCsvValue(
          questionnaireResponse.manipulationCheck.directUsability,
        ),
      manipulation_solution_actionability:
        toLikertCsvValue(
          questionnaireResponse.manipulationCheck.solutionActionability,
        ),
      probe_recall_noticed_update:
        questionnaireResponse.probeRecall.noticedUpdate,
      probe_recall_description:
        questionnaireResponse.probeRecall.updateDescription,
      probe_recall_affected_resource:
        questionnaireResponse.probeRecall.affectedRoom,
      probe_recall_affected_room:
        questionnaireResponse.probeRecall.affectedRoom,
      probe_recall_correct:
        probeRecallCorrect,
      probe_recall_confidence:
        toLikertCsvValue(
          questionnaireResponse.probeRecall.recallConfidence,
        ),
      probe_recognition_choice:
        recognitionChoice,
      probe_recognition_correct:
        probeRecognitionCorrect,
      probe_memory_classification:
        probeMemoryClassification,
      final_schedule:
        eventString(
          finalEvent,
          "scheduleAfter",
        ),
      final_state_hash:
        finalScheduleHash,
      final_structural_signature:
        eventString(
          finalEvent,
          "structuralSignatureAfter",
        ) ||
        eventString(
          finalEvent,
          "structuralSignature",
        ),
      final_macro_structure_signature:
        eventString(
          finalEvent,
          "macroStructureSignatureAfter",
          "macroStructureSignature",
        ) ||
        eventString(
          finalEvent,
          "macroStructureSignature",
          "macroStructureSignature",
        ),
      final_room_composition_signature:
        eventString(
          finalEvent,
          "roomCompositionSignatureAfter",
          "roomCompositionSignature",
        ) ||
        eventString(
          finalEvent,
          "roomCompositionSignature",
          "roomCompositionSignature",
        ),
      final_resource_composition_signature:
        eventString(
          finalEvent,
          "resourceCompositionSignatureAfter",
          "resourceCompositionSignature",
        ) ||
        eventString(
          finalEvent,
          "resourceCompositionSignature",
          "resourceCompositionSignature",
        ) ||
        eventString(
          finalEvent,
          "roomCompositionSignatureAfter",
          "roomCompositionSignature",
        ) ||
        eventString(
          finalEvent,
          "roomCompositionSignature",
          "roomCompositionSignature",
        ),
      events_csv_export_status:
        trial.eventsCsvExportStatus,
      summary_csv_export_status:
        trial.summaryCsvExportStatus,
      events_csv_exported_at_iso:
        trial.eventsCsvExportedAtIso ??
        "",
      summary_csv_exported_at_iso:
        trial.summaryCsvExportedAtIso ??
        "",
      export_error_message:
        trial.exportErrorMessage ??
        "",
      probe_onset_error_ms:
        eventNumber(
          probeShownEvent,
          "probeOnsetErrorMs",
          "probeOnsetErrorMs",
        ),
      first_complete_assignment_elapsed_ms:
        firstCompleteAssignmentElapsedMs,
      construction_edit_count:
        constructionEditCount,
      search_edit_count:
        searchEditCount,
      total_idle_ms:
        totalIdleMs,
      longest_idle_ms:
        longestIdleMs,
      strategy_switch_preceded_probe:
        strategySwitchPrecededProbe,
      entered_ai_family_occurred:
        enteredAIFamilyOccurred,
      entered_ai_family_elapsed_ms:
        enteredAIFamilyElapsedMs,
    };

  return [
    normalizeTrialMetricRow(
      summaryRow,
    ),
  ];
}
