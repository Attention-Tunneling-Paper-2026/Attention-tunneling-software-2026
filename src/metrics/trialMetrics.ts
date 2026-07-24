import type {
  StudyEvent,
} from "../types/events";

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

  roomCompositionSignature:
    string;

  hammingDistanceFromAI:
    number | null;

  insideAIFamily:
    boolean | null;
}

type UnknownRecord =
  Record<
    string,
    unknown
  >;

const MAXIMUM_SCHEDULE_SCORE =
  89;

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

function getFinalSubmissionEvent(
  events:
    StudyEvent[],
): StudyEvent | undefined {
  return (
    getLastEvent(
      events,
      "trial_submitted",
    ) ??
    getLastEvent(
      events,
      "submit_attempt",
    )
  );
}

function isAcceptedEdit(
  event:
    StudyEvent,
): boolean {
  return (
    event.eventType ===
      "drop" &&
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

  return Math.max(
    0,
    later.elapsedMs -
      earlier.elapsedMs,
  );
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

        roomCompositionSignature:
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

function countContiguousRuns(
  events:
    StudyEvent[],

  predicate: (
    event:
      StudyEvent,
  ) => boolean,
): number {
  let count =
    0;

  let insideRun =
    false;

  for (
    const event of
    events
  ) {
    const matches =
      predicate(
        event,
      );

    if (
      matches &&
      !insideRun
    ) {
      count +=
        1;
    }

    insideRun =
      matches;
  }

  return count;
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

function getProbeRecallCorrect(
  response:
    TrialQuestionnaireResponse,
): boolean {
  return (
    response.probeRecall
      .noticedUpdate ===
      "yes" &&
    response.probeRecall
      .affectedRoom ===
      "C"
  );
}

export function buildTrialEventRows(
  events:
    StudyEvent[],
): TrialMetricRow[] {
  return sortEvents(
    events,
  ).map(
    (event) => ({
      participant_id:
        event.participantId,
      session_id:
        event.sessionId,
      trial_id:
        event.trialId,
      trial_number:
        event.trialNumber,
      trial_order:
        event.trialOrder,
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
        event.taskId,
      task_instance_version:
        event.taskInstanceVersion ??
        "",
      app_version:
        event.appVersion ??
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
      talk_id:
        event.talkId ??
        "",
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
      drag_duration_ms:
        event.dragDurationMs ??
        null,
      probe_latency_ms:
        event.probeLatencyMs ??
        null,
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
      room_composition_signature_before:
        toStringValue(
          readMetadataValue(
            event,
            "previousRoomCompositionSignature",
          ),
        ),
      room_composition_signature_after:
        toStringValue(
          readMetadataValue(
            event,
            "roomCompositionSignature",
          ),
        ),
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
        null,
      speaker_conflicts_after:
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
      changed_talk_ids:
        serializeValue(
          readMetadataValue(
            event,
            "changedTalkIds",
          ),
        ),
      salvage_attempt:
        event.isSalvageAttempt ??
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
        event.isDestructiveEdit ??
        null,
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
        toNumberValue(
          readMetadataValue(
            event,
            "strategySwitchLatencyFromProbeMs",
          ),
        ),
      hamming_distance_at_strategy_switch:
        toNumberValue(
          readMetadataValue(
            event,
            "hammingDistanceAtStrategySwitch",
          ),
        ),
      probe_visible:
        event.probeVisible ??
        null,
      probe_acknowledged:
        event.probeAcknowledged ??
        null,
      integration_consistent_edit:
        event.integrationConsistentEdit ??
        null,
      probe_integration_detected:
        event.probeIntegrationDetected ??
        null,
      first_probe_integration:
        toBooleanValue(
          readMetadataValue(
            event,
            "firstProbeIntegration",
          ),
        ),
      latency_from_probe_ms:
        toNumberValue(
          readMetadataValue(
            event,
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
      post_probe_feasible_before:
        event.postProbeFeasibleBefore ??
        null,
      post_probe_feasible_after:
        event.postProbeFeasibleAfter ??
        null,
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
      metadata_json:
        serializeValue(
          event.metadata,
        ),
    }),
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
      "probe_acknowledged",
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

  const strategySwitchEvent =
    acceptedEdits.find(
      (event) =>
        event.strategySwitchTriggered ===
          true ||
        event.moatCrossed ===
          true,
    );

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

  const familyTime =
    calculateTimeInsideAIFamily(
      stateObservations,
      trialEndElapsedMs,
    );

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

  const finalScorePercentage =
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
            MAXIMUM_SCHEDULE_SCORE
          ) *
          100
        : null
    );

  const finalPostProbeFeasible =
    toBooleanValue(
      readMetadataValue(
        finalEvent,
        "postProbeFeasible",
      ),
    ) ??
    eventBoolean(
      finalEvent,
      "postProbeFeasibleAfter",
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

  const probeAcknowledged =
    Boolean(
      probeAcknowledgedEvent,
    );

  const probeIntegrated =
    Boolean(
      firstIntegrationEvent,
    );

  const strategySwitchOccurred =
    Boolean(
      strategySwitchEvent,
    );

  const summaryRow:
    TrialMetricRow = {
      participant_id:
        participantId,
      session_id:
        sessionId,
      trial_id:
        finalEvent?.trialId ??
        trialStartEvent?.trialId ??
        `symposium-trial-${trial.trialNumber}`,
      trial_number:
        trial.trialNumber,
      trial_order:
        trial.trialOrder,
      task_id:
        trial.taskId,
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
      probe_acknowledged_at_iso:
        trial.probeAcknowledgedAtIso ??
        probeAcknowledgedEvent?.timestampIso ??
        "",
      trial_submitted_at_iso:
        trial.submittedAtIso ??
        finalEvent?.timestampIso ??
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
        Math.max(
          0,
          trialEndElapsedMs -
            trialStartElapsedMs,
        ),
      event_count:
        sortedEvents.length,
      accepted_edit_count:
        acceptedEdits.length,
      edit_sequence_entropy_bits:
        calculateEntropy(
          transitionIds,
        ),
      edit_category_entropy_bits:
        calculateEntropy(
          editCategories,
        ),
      visited_state_count:
        stateObservations.length,
      unique_states_visited:
        uniqueStateObservations.length,
      revisited_state_count:
        countTrue(
          acceptedEdits,
          "statePreviouslyVisited",
        ),
      unique_room_compositions:
        uniqueRoomCompositions.size,
      unique_structural_signatures:
        uniqueStructuralSignatures.size,
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
      initial_score:
        firstScoreAfter,
      final_score:
        finalScore,
      final_score_maximum:
        MAXIMUM_SCHEDULE_SCORE,
      final_score_percentage:
        finalScorePercentage,
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
        acceptedEditsBeforeSwitch.length,
      accepted_edits_inside_ai_family_before_switch:
        acceptedEditsInsideFamilyBeforeSwitch.length,
      time_inside_ai_family_ms:
        familyTime.timeInsideMs,
      time_outside_ai_family_ms:
        familyTime.timeOutsideMs,
      time_proportion_inside_ai_family:
        familyTime.proportionInside,
      salvage_attempt_count:
        countTrue(
          acceptedEdits,
          "isSalvageAttempt",
        ),
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
        countContiguousRuns(
          acceptedEdits,
          (event) =>
            event.isSalvageAttempt ===
            true,
        ),
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
      destructive_edit_occurred:
        Boolean(
          firstDestructiveEditEvent,
        ),
      destructive_edit_count:
        countTrue(
          acceptedEdits,
          "isDestructiveEdit",
        ),
      destructive_edit_latency_ms:
        firstDestructiveEditEvent
          ? Math.max(
              0,
              firstDestructiveEditEvent.elapsedMs -
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
        strategySwitchEvent
          ? Math.max(
              0,
              strategySwitchEvent.elapsedMs -
                trialStartElapsedMs,
            )
          : null,
      strategy_switch_latency_from_probe_ms:
        getElapsedDifference(
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
        Boolean(
          permanentAIFamilyExit,
        ),
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
        getElapsedDifference(
          probeOpenedEvent,
          probeShownEvent,
        ),
      probe_acknowledgement_latency_ms:
        getElapsedDifference(
          probeAcknowledgedEvent,
          probeShownEvent,
        ),
      detection_miss:
        probeShown &&
        !probeAcknowledged,
      first_post_probe_edit_timestamp_iso:
        firstPostProbeEdit?.timestampIso ??
        "",
      first_post_probe_edit_latency_ms:
        getElapsedDifference(
          firstPostProbeEdit,
          probeShownEvent,
        ),
      first_integration_consistent_edit_timestamp_iso:
        firstIntegrationEvent?.timestampIso ??
        "",
      first_integration_consistent_edit_latency_ms:
        getElapsedDifference(
          firstIntegrationEvent,
          probeShownEvent,
        ),
      post_probe_edit_count:
        postProbeEdits.length,
      post_probe_edits_before_integration:
        postProbeEditsBeforeIntegration,
      probe_integrated:
        probeIntegrated,
      integration_miss:
        probeShown &&
        !probeIntegrated,
      detection_without_integration:
        probeAcknowledged &&
        !probeIntegrated,
      final_inside_ai_family:
        eventBoolean(
          finalEvent,
          "insideAIFamilyAfter",
        ),
      final_speaker_conflict_count:
        toNumberValue(
          readMetadataValue(
            finalEvent,
            "finalSpeakerConflictPairs",
          ),
        ) ??
        eventNumber(
          finalEvent,
          "speakerConflictsAfter",
        ),
      final_distance_to_best_post_probe_solution:
        toNumberValue(
          readMetadataValue(
            finalEvent,
            "distanceToBestPostProbeSolution",
          ),
        ),
      final_distance_to_nearest_feasible_post_probe_solution:
        null,
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
        toBooleanValue(
          readMetadataValue(
            finalEvent,
            "completeAssignment",
          ),
        ),
      final_structurally_legal:
        toBooleanValue(
          readMetadataValue(
            finalEvent,
            "structurallyLegal",
          ),
        ),
      final_post_probe_feasible:
        finalPostProbeFeasible,
      rational_abandonment:
        strategySwitchOccurred &&
        finalPostProbeFeasible ===
          true,
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
        questionnaireResponse.nasaTlx.mentalDemand,
      nasa_physical_demand:
        questionnaireResponse.nasaTlx.physicalDemand,
      nasa_temporal_demand:
        questionnaireResponse.nasaTlx.temporalDemand,
      nasa_performance:
        questionnaireResponse.nasaTlx.performance,
      nasa_effort:
        questionnaireResponse.nasaTlx.effort,
      nasa_frustration:
        questionnaireResponse.nasaTlx.frustration,
      schedule_completeness_rating:
        questionnaireResponse.experienceRatings.scheduleCompleteness,
      ai_helpfulness_rating:
        questionnaireResponse.experienceRatings.aiHelpfulness,
      ai_competence_rating:
        questionnaireResponse.experienceRatings.aiCompetence,
      manipulation_recommendation_specificity:
        questionnaireResponse.manipulationCheck.recommendationSpecificity,
      manipulation_solution_concreteness:
        questionnaireResponse.manipulationCheck.solutionConcreteness,
      manipulation_solution_completeness:
        questionnaireResponse.manipulationCheck.solutionCompleteness,
      manipulation_recommendation_detail:
        questionnaireResponse.manipulationCheck.recommendationDetail,
      manipulation_direct_usability:
        questionnaireResponse.manipulationCheck.directUsability,
      manipulation_solution_actionability:
        questionnaireResponse.manipulationCheck.solutionActionability,
      probe_recall_noticed_update:
        questionnaireResponse.probeRecall.noticedUpdate,
      probe_recall_description:
        questionnaireResponse.probeRecall.updateDescription,
      probe_recall_affected_room:
        questionnaireResponse.probeRecall.affectedRoom,
      probe_recall_correct:
        getProbeRecallCorrect(
          questionnaireResponse,
        ),
      probe_recall_confidence:
        questionnaireResponse.probeRecall.recallConfidence,
      final_schedule:
        eventString(
          finalEvent,
          "scheduleAfter",
        ),
      final_state_hash:
        eventString(
          finalEvent,
          "stateHashAfter",
        ),
      final_structural_signature:
        eventString(
          finalEvent,
          "structuralSignatureAfter",
        ) ||
        eventString(
          finalEvent,
          "structuralSignature",
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
    };

  return [
    summaryRow,
  ];
}
