import { create } from "zustand";

import {
  getStudyTaskDefinition,
  isSupportedStudyTaskId,
} from "../data/symposium";

import type {
  SupportedStudyTaskId,
} from "../data/symposium";

import type {
  CreateStudyEventInput,
  StudyEvent,
  StudyPhase,
} from "../types/events";

import {
  DEFAULT_CONDITION_ORDER,
  getConditionForTrial,
  isConditionOrder,
} from "../types/scheduler";

import type {
  ConcretizationLevel,
  ConditionOrder,
  StudyTrialNumber,
  StudyTrialOrder,
  StudyTrialOrderValue,
} from "../types/scheduler";

type ConditionOrderValue = ConditionOrder | number;
type TrialMetadataKey = `${SupportedStudyTaskId}:${StudyTrialNumber}`;

const TASK_ORDER: Record<SupportedStudyTaskId, number> = {
  symposium: 1,
  delivery: 2,
  clinic: 3,
};

const TRIALS_PER_TASK = 3;

interface StartTrialInput {
  taskId?: SupportedStudyTaskId;
  trialId?: string;
  trialNumber: StudyTrialNumber;
  trialOrder?: StudyTrialOrder;
  conditionOrder?: ConditionOrderValue;
  isFirstTrial?: boolean;
  probeExposureNumber?: number;
  probeNaive?: boolean;
}

interface ResetEventLogInput {
  participantId?: string;
  participantToken?: string;
  sessionId?: string;
  conditionOrder?: ConditionOrderValue;
  taskId?: SupportedStudyTaskId;
}

interface TrialEventMetadata {
  taskId: SupportedStudyTaskId;
  trialId: string;
  trialNumber: StudyTrialNumber;
  trialOrder: StudyTrialOrderValue;
  conditionOrder: ConditionOrderValue;
  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;
  outerTaskNumber: number;
  innerTaskNumber: number;
  globalOptionNumber: number;
  globalTrialNumber: number;
  startedAt: number;
  startedAtIso: string;
}

interface EventLogStore {
  sessionId: string;
  participantId: string;
  participantToken: string;

  taskId: SupportedStudyTaskId;
  trialId: string;
  trialNumber: StudyTrialNumber;
  trialOrder: StudyTrialOrderValue;
  condition: ConcretizationLevel;
  conditionOrder: ConditionOrderValue;

  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;

  sessionStartedAt: number;
  sessionStartedAtIso: string;
  trialStartedAt: number;
  trialStartedAtIso: string | null;
  trialMetadata: Partial<
    Record<TrialMetadataKey, TrialEventMetadata>
  >;

  events: StudyEvent[];

  setParticipantId: (participantId: string) => void;
  setParticipantToken: (participantToken: string) => void;
  setSessionId: (sessionId: string) => void;
  setConditionOrder: (
    conditionOrder: ConditionOrderValue,
  ) => void;

  startTrial: (input: StartTrialInput) => void;
  addEvent: (
    input: CreateStudyEventInput,
  ) => StudyEvent;

  getEventsForTrial: (
    trialNumber: StudyTrialNumber,
    taskId?: SupportedStudyTaskId,
  ) => StudyEvent[];

  /*
   * Retained for compatibility. It intentionally does not delete events,
   * because the study log is append-only across the full session.
   */
  clearEvents: () => void;
  clearAllEvents: () => void;

  resetForNewParticipant: (
    input?: ResetEventLogInput,
  ) => void;

  exportEvents: (
    trialNumber?: StudyTrialNumber,
    taskId?: SupportedStudyTaskId,
  ) => string;

  downloadEvents: (
    trialNumber?: StudyTrialNumber,
    taskId?: SupportedStudyTaskId,
  ) => void;
}

const APP_VERSION =
  "attention-tunneling-software-v3";
const DEFAULT_PARTICIPANT_ID = "P001";
const DEFAULT_TASK_ID: SupportedStudyTaskId = "symposium";
const DEFAULT_TRIAL_NUMBER: StudyTrialNumber = 1;
const FALLBACK_BUILD_HASH = "local-development";

function getBuildHash(): string {
  const configuredBuildHash =
    import.meta.env.VITE_BUILD_HASH?.trim();

  return configuredBuildHash ||
    FALLBACK_BUILD_HASH;
}

const BUILD_HASH = getBuildHash();

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("_");
}

function createSessionId(): string {
  return `SESSION_${createId()}`;
}

function getCurrentTimeMs(): number {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}

function normalizeTrialOrderValue(
  value: number | undefined,
  fallback: StudyTrialOrderValue,
): StudyTrialOrderValue {
  if (
    value === 0 ||
    value === 1 ||
    value === 2 ||
    value === 3
  ) {
    return value;
  }

  return fallback;
}

function normalizeStartedTrialOrder(
  value: number | undefined,
  fallback: StudyTrialOrderValue,
): StudyTrialOrderValue {
  if (
    value === 1 ||
    value === 2 ||
    value === 3
  ) {
    return value;
  }

  return fallback;
}

function normalizeConditionOrder(
  value: ConditionOrderValue | undefined,
  fallback: ConditionOrderValue,
): ConditionOrderValue {
  if (isConditionOrder(value)) {
    return value;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
}

function getTrialMetadataKey(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): TrialMetadataKey {
  return `${taskId}:${trialNumber}`;
}

function getOuterTaskNumber(
  taskId: SupportedStudyTaskId,
): number {
  return TASK_ORDER[taskId];
}

function getGlobalOptionNumber(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): number {
  return (
    (getOuterTaskNumber(taskId) - 1) *
      TRIALS_PER_TASK +
    trialNumber
  );
}

function getCompositeTrialId(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  return `${taskId}-${getConditionForTrial(trialNumber)}`;
}

function isLegacyTrialId(
  value: string,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): boolean {
  return (
    value === `${taskId}-trial-${trialNumber}` ||
    value === `symposium-trial-${trialNumber}`
  );
}

function normalizeTrialId(
  value: string | undefined,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  const normalizedValue = value?.trim();

  if (
    !normalizedValue ||
    isLegacyTrialId(
      normalizedValue,
      taskId,
      trialNumber,
    )
  ) {
    return getCompositeTrialId(taskId, trialNumber);
  }

  return normalizedValue;
}

function inferTaskIdFromTrialId(
  trialId: unknown,
): SupportedStudyTaskId | undefined {
  if (typeof trialId !== "string") {
    return undefined;
  }

  const prefix = trialId.split(/[-:]/, 1)[0];

  return isSupportedStudyTaskId(prefix)
    ? prefix
    : undefined;
}

function resolveTaskId(
  ...values: unknown[]
): SupportedStudyTaskId {
  for (const value of values) {
    if (isSupportedStudyTaskId(value)) {
      return value;
    }

    const inferredFromTrialId =
      inferTaskIdFromTrialId(value);

    if (inferredFromTrialId) {
      return inferredFromTrialId;
    }
  }

  return DEFAULT_TASK_ID;
}

function readInputTaskId(
  input: CreateStudyEventInput,
): unknown {
  return (
    input as unknown as {
      taskId?: unknown;
    }
  ).taskId;
}

function readInputMetadataTaskId(
  input: CreateStudyEventInput,
): unknown {
  const metadata = (
    input as unknown as {
      metadata?: unknown;
    }
  ).metadata;

  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return undefined;
  }

  return (
    metadata as Record<string, unknown>
  ).taskId;
}

function readInputTrialId(
  input: CreateStudyEventInput,
): unknown {
  return (
    input as unknown as {
      trialId?: unknown;
    }
  ).trialId;
}

function readInputParticipantToken(
  input: CreateStudyEventInput,
): string | undefined {
  const participantToken = (
    input as unknown as {
      participantToken?: unknown;
    }
  ).participantToken;

  return typeof participantToken === "string"
    ? participantToken
    : undefined;
}

function getEventTaskId(
  event: StudyEvent,
): SupportedStudyTaskId {
  const metadata =
    event.metadata &&
    typeof event.metadata === "object" &&
    !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};

  return resolveTaskId(
    event.taskId,
    metadata.taskId,
    event.trialId,
  );
}

function cloneOptionalArray<T>(
  value: T[] | null | undefined,
): T[] | null | undefined {
  return Array.isArray(value) ? [...value] : value;
}

function isTrialStartEvent(
  event: StudyEvent,
): boolean {
  return event.eventType === "trial_start";
}

function getStartedTrialKeys(
  events: StudyEvent[],
  sessionId: string,
): Set<TrialMetadataKey> {
  const startedTrialKeys =
    new Set<TrialMetadataKey>();

  for (const event of events) {
    if (
      event.sessionId !== sessionId ||
      !isTrialStartEvent(event)
    ) {
      continue;
    }

    const taskId = getEventTaskId(event);

    startedTrialKeys.add(
      getTrialMetadataKey(
        taskId,
        event.trialNumber,
      ),
    );
  }

  return startedTrialKeys;
}

function inferTrialOrder(
  events: StudyEvent[],
  sessionId: string,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
  trialMetadata?: Partial<
    Record<
      TrialMetadataKey,
      TrialEventMetadata
    >
  >,
): StudyTrialOrderValue {
  const trialKey =
    getTrialMetadataKey(
      taskId,
      trialNumber,
    );
  const existingMetadata =
    trialMetadata?.[trialKey];

  if (
    existingMetadata?.trialOrder === 1 ||
    existingMetadata?.trialOrder === 2 ||
    existingMetadata?.trialOrder === 3
  ) {
    return existingMetadata.trialOrder;
  }

  const existingTrialEvent = events.find(
    (event) =>
      event.sessionId === sessionId &&
      getEventTaskId(event) === taskId &&
      event.trialNumber === trialNumber &&
      event.trialOrder > 0,
  );

  if (
    existingTrialEvent?.trialOrder === 1 ||
    existingTrialEvent?.trialOrder === 2 ||
    existingTrialEvent?.trialOrder === 3
  ) {
    return existingTrialEvent.trialOrder;
  }

  const startedTrialKeys =
    getStartedTrialKeys(
      events,
      sessionId,
    );

  if (trialMetadata) {
    for (
      const [
        metadataKey,
        metadata,
      ] of Object.entries(
        trialMetadata,
      )
    ) {
      if (
        metadata &&
        metadata.trialOrder > 0
      ) {
        startedTrialKeys.add(
          metadataKey as TrialMetadataKey,
        );
      }
    }
  }

  const nextOrder =
    startedTrialKeys.size + 1;

  return nextOrder === 1 ||
    nextOrder === 2 ||
    nextOrder === 3
    ? nextOrder
    : 0;
}

function getDefaultTrialMetadata(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrderValue =
    DEFAULT_CONDITION_ORDER,
  trialOrder: StudyTrialOrderValue = 0,
): Omit<
  TrialEventMetadata,
  "trialId" | "startedAt" | "startedAtIso"
> {
  const globalOptionNumber =
    getGlobalOptionNumber(
      taskId,
      trialNumber,
    );
  const normalizedTrialOrder =
    normalizeTrialOrderValue(
      trialOrder,
      0,
    );

  return {
    taskId,
    trialNumber,
    trialOrder: normalizedTrialOrder,
    conditionOrder,
    isFirstTrial: normalizedTrialOrder === 1,
    probeExposureNumber:
      normalizedTrialOrder,
    probeNaive:
      normalizedTrialOrder === 1,
    outerTaskNumber:
      getOuterTaskNumber(taskId),
    innerTaskNumber: trialNumber,
    globalOptionNumber,
    globalTrialNumber:
      globalOptionNumber,
  };
}

function getSessionEventIndex(
  events: StudyEvent[],
  sessionId: string,
): number {
  return (
    events.filter(
      (event) => event.sessionId === sessionId,
    ).length + 1
  );
}

function trialHasProbeStarted(
  events: StudyEvent[],
  sessionId: string,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): boolean {
  return events.some(
    (event) =>
      event.sessionId === sessionId &&
      getEventTaskId(event) === taskId &&
      event.trialNumber === trialNumber &&
      event.eventType === "probe_shown",
  );
}

function inferPhase(
  input: CreateStudyEventInput,
  events: StudyEvent[],
  sessionId: string,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): StudyPhase {
  if (input.phase) {
    return input.phase;
  }

  switch (input.eventType) {
    case "study_started":
    case "session_start":
    case "screen_enter":
    case "screen_exit":
      return "session";

    case "procedure_viewed":
      return "consent";

    case "task_selected":
    case "assistant_analysis_requested":
    case "assistant_analysis_started":
      return "pre_ai";

    case "assistant_analysis_completed":
    case "assistant_recommendation_shown":
    case "ai_message_shown":
    case "ai_prompt_sent":
    case "ai_response_received":
    case "ai_fallback_used":
      return "pre_probe";

    case "questionnaire_started":
    case "questionnaire_submitted":
    case "trial_csv_exported":
    case "form_submitted":
      return "questionnaire";

    case "post_experiment_started":
    case "post_experiment_submitted":
    case "post_experiment_csv_exported":
      return "post_experiment";

    case "disclosure_viewed":
      return "disclosure";

    case "study_completed":
    case "session_end":
    case "export_downloaded":
      return "complete";

    case "trial_submitted":
    case "timer_expired":
    case "trial_end":
      return "submitted";

    case "probe_shown":
    case "probe_notification_opened":
    case "probe_acknowledged":
    case "probe_ack":
    case "probe_collapsed":
      return "post_probe";

    case "submit_attempt":
      return trialHasProbeStarted(
        events,
        sessionId,
        taskId,
        trialNumber,
      )
        ? "post_probe"
        : "pre_probe";

    default:
      return trialHasProbeStarted(
        events,
        sessionId,
        taskId,
        trialNumber,
      )
        ? "post_probe"
        : "pre_probe";
  }
}

function sanitizeFilePart(value: string): string {
  const sanitizedValue = value
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitizedValue.length > 0
    ? sanitizedValue
    : "participant";
}

const EVENT_CSV_COLUMNS = [
  "participant_id",
  "participant_token",
  "session_id",
  "session_started_at_iso",
  "task_id",
  "skin",
  "trial_id",
  "composite_trial_id",
  "trial_number",
  "trial_order",
  "trial_index",
  "global_option_number",
  "global_trial_number",
  "outer_task_number",
  "inner_task_number",
  "condition",
  "condition_order",
  "is_first_trial",
  "probe_exposure_number",
  "probe_naive",
  "trial_started_at_iso",
  "task_instance_version",
  "app_version",
  "build_hash",
  "event_id",
  "event_index",
  "event_type",
  "phase",
  "timestamp_iso",
  "elapsed_ms",
  "t_ms",
  "talk_id",
  "item_id",
  "displaced_talk_id",
  "displaced_item_id",
  "from_room",
  "from_slot",
  "to_room",
  "to_slot",
  "from_resource",
  "from_period",
  "to_resource",
  "to_period",
  "source",
  "action",
  "success",
  "illegal_reason",
  "drag_duration_ms",
  "probe_latency_ms",
  "latency_from_probe_ms",
  "schedule_before",
  "schedule_after",
  "state_hash_before",
  "state_hash_after",
  "structural_signature_before",
  "structural_signature_after",
  "macro_structure_signature_before",
  "macro_structure_signature_after",
  "room_composition_signature_before",
  "room_composition_signature_after",
  "resource_composition_signature_before",
  "resource_composition_signature_after",
  "score_before",
  "score_after",
  "score_delta",
  "speaker_conflicts_before",
  "speaker_conflicts_after",
  "actor_conflicts_before",
  "actor_conflicts_after",
  "hamming_distance_from_ai_before",
  "hamming_distance_from_ai_after",
  "hamming_distance_from_ai",
  "inside_ai_family_before",
  "inside_ai_family_after",
  "state_previously_visited",
  "is_immediate_reversal",
  "is_backtracking",
  "edit_category",
  "theoretical_edit_category",
  "is_salvage_attempt",
  "is_non_improving_edit",
  "is_plateau_edit",
  "is_destructive_edit",
  "transition_id",
  "is_optimal_destructive_transition",
  "strategy_switch_triggered",
  "probe_visible",
  "probe_acknowledged",
  "probe_display_mode",
  "probe_acknowledgment_source",
  "integration_consistent_edit",
  "probe_integration_detected",
  "detection_miss",
  "integration_miss",
  "detection_without_integration",
  "post_probe_feasible",
  "post_probe_feasible_before",
  "post_probe_feasible_after",
  "unresolved_demo_talk_ids_json",
  "unresolved_demo_talk_ids_before_json",
  "unresolved_demo_talk_ids_after_json",
  "unresolved_required_item_ids_json",
  "unresolved_required_item_ids_before_json",
  "unresolved_required_item_ids_after_json",
  "resulting_violations_json",
  "violation_count",
  "structural_signature",
  "macro_structure_signature",
  "room_composition_signature",
  "resource_composition_signature",
  "moat_crossed",
  "remaining_ms",
  "timer_warning_level",
  "accepted",
  "trial_end_reason",
  "rendered_text",
  "message_id",
  "content_version",
  "probe_compliant",
  "configured_probe_onset_ms",
  "actual_probe_onset_ms",
  "probe_onset_error_ms",
  "metadata_json",
  "payload_json",
] as const;

type EventCsvColumn =
  (typeof EVENT_CSV_COLUMNS)[number];

function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function stableJsonValue(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(stableJsonValue);
  }

  if (isPlainRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>(
        (result, key) => {
          result[key] =
            stableJsonValue(value[key]);

          return result;
        },
        {},
      );
  }

  return value;
}

function stableJsonStringify(
  value: unknown,
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  try {
    return JSON.stringify(
      stableJsonValue(value),
    );
  } catch {
    return String(value);
  }
}

function toCsvScalar(
  value: unknown,
): string | number {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  return stableJsonStringify(value);
}

function escapeCsvValue(
  value: unknown,
): string {
  const scalar = String(
    toCsvScalar(value),
  );

  return /[",\r\n]/.test(scalar)
    ? `"${scalar.replace(/"/g, '""')}"`
    : scalar;
}

function getRecordValue(
  record: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(
        record,
        key,
      )
    ) {
      return record[key];
    }
  }

  return undefined;
}

function getEventSupplementValue(
  event: StudyEvent,
  ...keys: string[]
): unknown {
  const eventRecord =
    event as unknown as Record<
      string,
      unknown
    >;
  const metadata = isPlainRecord(
    event.metadata,
  )
    ? event.metadata
    : {};
  const payload = isPlainRecord(
    event.payload,
  )
    ? event.payload
    : {};

  return (
    getRecordValue(
      eventRecord,
      ...keys,
    ) ??
    getRecordValue(
      metadata,
      ...keys,
    ) ??
    getRecordValue(
      payload,
      ...keys,
    )
  );
}

function createEventCsvRow(
  event: StudyEvent,
): Record<EventCsvColumn, unknown> {
  const metadata = isPlainRecord(
    event.metadata,
  )
    ? event.metadata
    : {};
  const metadataGlobalOptionNumber =
    getRecordValue(
      metadata,
      "globalOptionNumber",
      "global_option_number",
      "globalTrialNumber",
      "global_trial_number",
    );
  const parsedGlobalOptionNumber =
    Number(
      metadataGlobalOptionNumber,
    );
  const globalOptionNumber =
    event.globalOptionNumber ??
    event.globalTrialNumber ??
    (
      Number.isFinite(
        parsedGlobalOptionNumber,
      )
        ? parsedGlobalOptionNumber
        : ""
    );
  const trialStartedAtIso =
    getEventSupplementValue(
      event,
      "trialStartedAtIso",
      "trial_started_at_iso",
    );
  const sessionStartedAtIso =
    getEventSupplementValue(
      event,
      "sessionStartedAtIso",
      "session_started_at_iso",
    );

  return {
    participant_id:
      event.participantId,
    participant_token:
      event.participantToken,
    session_id:
      event.sessionId,
    session_started_at_iso:
      sessionStartedAtIso,
    task_id:
      event.taskId,
    skin:
      event.skin,
    trial_id:
      event.trialId,
    composite_trial_id:
      event.compositeTrialId ??
      event.trialId,
    trial_number:
      event.trialNumber,
    trial_order:
      event.trialOrder,
    trial_index:
      event.trialIndex,
    global_option_number:
      globalOptionNumber,
    global_trial_number:
      event.globalTrialNumber ??
      globalOptionNumber,
    outer_task_number:
      event.outerTaskNumber,
    inner_task_number:
      event.innerTaskNumber,
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
    trial_started_at_iso:
      trialStartedAtIso,
    task_instance_version:
      event.taskInstanceVersion,
    app_version:
      event.appVersion,
    build_hash:
      event.buildHash,
    event_id:
      event.eventId,
    event_index:
      event.eventIndex,
    event_type:
      event.eventType,
    phase:
      event.phase,
    timestamp_iso:
      event.timestampIso,
    elapsed_ms:
      event.elapsedMs,
    t_ms:
      event.tMs,
    talk_id:
      event.talkId,
    item_id:
      event.itemId,
    displaced_talk_id:
      event.displacedTalkId,
    displaced_item_id:
      event.displacedItemId,
    from_room:
      event.fromRoom,
    from_slot:
      event.fromSlot,
    to_room:
      event.toRoom,
    to_slot:
      event.toSlot,
    from_resource:
      event.fromResource,
    from_period:
      event.fromPeriod,
    to_resource:
      event.toResource,
    to_period:
      event.toPeriod,
    source:
      event.source,
    action:
      event.action,
    success:
      event.success,
    illegal_reason:
      event.illegalReason,
    drag_duration_ms:
      event.dragDurationMs,
    probe_latency_ms:
      event.probeLatencyMs,
    latency_from_probe_ms:
      event.latencyFromProbeMs,
    schedule_before:
      event.scheduleBefore,
    schedule_after:
      event.scheduleAfter,
    state_hash_before:
      event.stateHashBefore,
    state_hash_after:
      event.stateHashAfter,
    structural_signature_before:
      event.structuralSignatureBefore,
    structural_signature_after:
      event.structuralSignatureAfter,
    macro_structure_signature_before:
      event.macroStructureSignatureBefore,
    macro_structure_signature_after:
      event.macroStructureSignatureAfter,
    room_composition_signature_before:
      event.roomCompositionSignatureBefore,
    room_composition_signature_after:
      event.roomCompositionSignatureAfter,
    resource_composition_signature_before:
      event.resourceCompositionSignatureBefore,
    resource_composition_signature_after:
      event.resourceCompositionSignatureAfter,
    score_before:
      event.scoreBefore,
    score_after:
      event.scoreAfter,
    score_delta:
      event.scoreDelta,
    speaker_conflicts_before:
      event.speakerConflictsBefore,
    speaker_conflicts_after:
      event.speakerConflictsAfter,
    actor_conflicts_before:
      event.actorConflictsBefore,
    actor_conflicts_after:
      event.actorConflictsAfter,
    hamming_distance_from_ai_before:
      event.hammingDistanceFromAIBefore,
    hamming_distance_from_ai_after:
      event.hammingDistanceFromAIAfter,
    hamming_distance_from_ai:
      event.hammingDistanceFromAI,
    inside_ai_family_before:
      event.insideAIFamilyBefore,
    inside_ai_family_after:
      event.insideAIFamilyAfter,
    state_previously_visited:
      event.statePreviouslyVisited,
    is_immediate_reversal:
      event.isImmediateReversal,
    is_backtracking:
      event.isBacktracking,
    edit_category:
      event.editCategory,
    theoretical_edit_category:
      event.theoreticalEditCategory,
    is_salvage_attempt:
      event.isSalvageAttempt,
    is_non_improving_edit:
      event.isNonImprovingEdit,
    is_plateau_edit:
      event.isPlateauEdit,
    is_destructive_edit:
      event.isDestructiveEdit,
    transition_id:
      event.transitionId,
    is_optimal_destructive_transition:
      event.isOptimalDestructiveTransition,
    strategy_switch_triggered:
      event.strategySwitchTriggered,
    probe_visible:
      event.probeVisible,
    probe_acknowledged:
      event.probeAcknowledged,
    probe_display_mode:
      event.probeDisplayMode,
    probe_acknowledgment_source:
      event.probeAcknowledgmentSource,
    integration_consistent_edit:
      event.integrationConsistentEdit,
    probe_integration_detected:
      event.probeIntegrationDetected,
    detection_miss:
      event.detectionMiss,
    integration_miss:
      event.integrationMiss,
    detection_without_integration:
      event.detectionWithoutIntegration,
    post_probe_feasible:
      event.postProbeFeasible,
    post_probe_feasible_before:
      event.postProbeFeasibleBefore,
    post_probe_feasible_after:
      event.postProbeFeasibleAfter,
    unresolved_demo_talk_ids_json:
      event.unresolvedDemoTalkIds,
    unresolved_demo_talk_ids_before_json:
      event.unresolvedDemoTalkIdsBefore,
    unresolved_demo_talk_ids_after_json:
      event.unresolvedDemoTalkIdsAfter,
    unresolved_required_item_ids_json:
      event.unresolvedRequiredItemIds,
    unresolved_required_item_ids_before_json:
      event.unresolvedRequiredItemIdsBefore,
    unresolved_required_item_ids_after_json:
      event.unresolvedRequiredItemIdsAfter,
    resulting_violations_json:
      event.resultingViolations,
    violation_count:
      event.violationCount,
    structural_signature:
      event.structuralSignature,
    macro_structure_signature:
      event.macroStructureSignature,
    room_composition_signature:
      event.roomCompositionSignature,
    resource_composition_signature:
      event.resourceCompositionSignature,
    moat_crossed:
      event.moatCrossed,
    remaining_ms:
      event.remainingMs,
    timer_warning_level:
      event.timerWarningLevel,
    accepted:
      event.accepted,
    trial_end_reason:
      event.trialEndReason,
    rendered_text:
      event.renderedText,
    message_id:
      event.messageId,
    content_version:
      event.contentVersion,
    probe_compliant:
      event.probeCompliant,
    configured_probe_onset_ms:
      getEventSupplementValue(
        event,
        "configuredProbeOnsetMs",
        "configured_probe_onset_ms",
        "configuredProbeDelayMs",
        "configured_probe_delay_ms",
      ),
    actual_probe_onset_ms:
      getEventSupplementValue(
        event,
        "actualProbeOnsetMs",
        "actual_probe_onset_ms",
        "probeShownElapsedMs",
        "probe_shown_elapsed_ms",
      ),
    probe_onset_error_ms:
      getEventSupplementValue(
        event,
        "probeOnsetErrorMs",
        "probe_onset_error_ms",
        "onsetErrorMs",
        "onset_error_ms",
      ),
    metadata_json:
      event.metadata,
    payload_json:
      event.payload,
  };
}

function serializeEventsCsv(
  events: StudyEvent[],
): string {
  const header = EVENT_CSV_COLUMNS.join(
    ",",
  );
  const rows = events.map(
    (event) => {
      const row =
        createEventCsvRow(event);

      return EVENT_CSV_COLUMNS.map(
        (column) =>
          escapeCsvValue(
            row[column],
          ),
      ).join(",");
    },
  );

  return [
    header,
    ...rows,
  ].join("\r\n");
}

function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined"
  ) {
    return;
  }

  const blob = new Blob([content], {
    type: mimeType,
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function createInitialState(
  input?: ResetEventLogInput,
) {
  const taskId = resolveTaskId(
    input?.taskId,
    DEFAULT_TASK_ID,
  );
  const trialNumber =
    DEFAULT_TRIAL_NUMBER;
  const conditionOrder =
    normalizeConditionOrder(
      input?.conditionOrder,
      DEFAULT_CONDITION_ORDER,
    );
  const sessionStartedAt =
    getCurrentTimeMs();
  const sessionStartedAtIso =
    new Date().toISOString();
  const defaultMetadata =
    getDefaultTrialMetadata(
      taskId,
      trialNumber,
      conditionOrder,
      0,
    );
  const trialId =
    getCompositeTrialId(
      taskId,
      trialNumber,
    );
  const participantIdValue =
    input?.participantId?.trim() ||
    input?.participantToken?.trim() ||
    DEFAULT_PARTICIPANT_ID;
  const participantTokenValue =
    input?.participantToken?.trim() ||
    participantIdValue;
  const sessionValue =
    input?.sessionId?.trim() ||
    createSessionId();

  return {
    sessionId: sessionValue,
    participantId:
      participantIdValue,
    participantToken:
      participantTokenValue,
    taskId,
    trialId,
    trialNumber,
    trialOrder:
      defaultMetadata.trialOrder,
    condition:
      getConditionForTrial(
        trialNumber,
      ),
    conditionOrder,
    isFirstTrial: false,
    probeExposureNumber: 0,
    probeNaive: false,
    sessionStartedAt,
    sessionStartedAtIso,
    trialStartedAt:
      sessionStartedAt,
    trialStartedAtIso: null,
    /*
     * No trial is considered started until startTrial is called. Keeping this
     * empty prevents the default Symposium-A placeholder from being mistaken
     * for the participant's first chronological trial.
     */
    trialMetadata: {} as Partial<
      Record<
        TrialMetadataKey,
        TrialEventMetadata
      >
    >,
    events: [] as StudyEvent[],
  };
}

export const useEventLogStore =
  create<EventLogStore>((set, get) => ({
    ...createInitialState(),

    setParticipantId: (participantId) => {
      const normalized = participantId.trim();

      if (!normalized) {
        return;
      }

      set({
        participantId: normalized,
        participantToken: normalized,
      });
    },

    setParticipantToken: (participantToken) => {
      const normalized = participantToken.trim();

      if (!normalized) {
        return;
      }

      set({
        participantId: normalized,
        participantToken: normalized,
      });
    },

    setSessionId: (sessionId) => {
      const normalized = sessionId.trim();

      if (!normalized) {
        return;
      }

      set({ sessionId: normalized });
    },

    setConditionOrder: (conditionOrder) => {
      const state = get();
      const normalized = normalizeConditionOrder(
        conditionOrder,
        state.conditionOrder,
      );
      const trialKey = getTrialMetadataKey(
        state.taskId,
        state.trialNumber,
      );
      const existingMetadata =
        state.trialMetadata[trialKey];

      set({
        conditionOrder: normalized,
        trialMetadata: existingMetadata
          ? {
              ...state.trialMetadata,
              [trialKey]: {
                ...existingMetadata,
                conditionOrder: normalized,
              },
            }
          : state.trialMetadata,
      });
    },

    startTrial: ({
      taskId: requestedTaskId,
      trialId,
      trialNumber,
      trialOrder,
      conditionOrder,
    }) => {
      const state = get();
      const taskId = resolveTaskId(
        requestedTaskId,
        trialId,
        state.taskId,
      );
      const trialKey =
        getTrialMetadataKey(
          taskId,
          trialNumber,
        );
      const existingMetadata =
        state.trialMetadata[trialKey];
      const resolvedConditionOrder =
        normalizeConditionOrder(
          conditionOrder,
          existingMetadata?.conditionOrder ??
            state.conditionOrder,
        );
      const inferredOrder =
        inferTrialOrder(
          state.events,
          state.sessionId,
          taskId,
          trialNumber,
          state.trialMetadata,
        );
      const normalizedTrialOrder =
        normalizeStartedTrialOrder(
          trialOrder,
          existingMetadata?.trialOrder ??
            inferredOrder,
        );

      if (
        normalizedTrialOrder === 0
      ) {
        return;
      }

      const defaultMetadata =
        getDefaultTrialMetadata(
          taskId,
          trialNumber,
          resolvedConditionOrder,
          normalizedTrialOrder,
        );
      const resolvedStartedAt =
        existingMetadata?.startedAt ??
        getCurrentTimeMs();
      const resolvedStartedAtIso =
        existingMetadata?.startedAtIso ??
        new Date().toISOString();
      const resolvedTrialId =
        normalizeTrialId(
          trialId ??
            existingMetadata?.trialId,
          taskId,
          trialNumber,
        );

      const resolvedMetadata:
        TrialEventMetadata = {
          ...defaultMetadata,
          trialId:
            resolvedTrialId,
          isFirstTrial:
            normalizedTrialOrder === 1,
          probeExposureNumber:
            normalizedTrialOrder,
          probeNaive:
            normalizedTrialOrder === 1,
          startedAt:
            resolvedStartedAt,
          startedAtIso:
            resolvedStartedAtIso,
        };

      set({
        taskId,
        trialId:
          resolvedMetadata.trialId,
        trialNumber,
        trialOrder:
          resolvedMetadata.trialOrder,
        condition:
          getConditionForTrial(
            trialNumber,
          ),
        conditionOrder:
          resolvedMetadata.conditionOrder,
        isFirstTrial:
          resolvedMetadata.isFirstTrial,
        probeExposureNumber:
          resolvedMetadata.probeExposureNumber,
        probeNaive:
          resolvedMetadata.probeNaive,
        trialStartedAt:
          resolvedMetadata.startedAt,
        trialStartedAtIso:
          resolvedMetadata.startedAtIso,
        trialMetadata: {
          ...state.trialMetadata,
          [trialKey]:
            resolvedMetadata,
        },
      });
    },

    addEvent: (input) => {
      const state = get();
      const trialNumber =
        input.trialNumber ??
        state.trialNumber;
      const taskId = resolveTaskId(
        readInputTaskId(input),
        readInputMetadataTaskId(
          input,
        ),
        readInputTrialId(input),
        state.taskId,
      );
      const trialKey =
        getTrialMetadataKey(
          taskId,
          trialNumber,
        );
      const condition =
        input.condition ??
        getConditionForTrial(
          trialNumber,
        );
      const storedMetadata =
        state.trialMetadata[
          trialKey
        ];
      const conditionOrder =
        normalizeConditionOrder(
          input.conditionOrder,
          storedMetadata?.conditionOrder ??
            state.conditionOrder,
        );
      const sameActiveTrial =
        taskId === state.taskId &&
        trialNumber ===
          state.trialNumber;
      let fallbackTrialOrder:
        StudyTrialOrderValue =
          storedMetadata?.trialOrder ??
          (sameActiveTrial
            ? state.trialOrder
            : 0);

      if (
        fallbackTrialOrder === 0 &&
        input.eventType ===
          "trial_start"
      ) {
        fallbackTrialOrder =
          inferTrialOrder(
            state.events,
            state.sessionId,
            taskId,
            trialNumber,
            state.trialMetadata,
          );
      }

      const normalizedTrialOrder =
        normalizeTrialOrderValue(
          input.trialOrder,
          fallbackTrialOrder,
        );
      const defaultMetadata =
        getDefaultTrialMetadata(
          taskId,
          trialNumber,
          conditionOrder,
          normalizedTrialOrder,
        );
      const isFirstTrial =
        normalizedTrialOrder === 1;
      const probeExposureNumber =
        normalizedTrialOrder;
      const probeNaive =
        normalizedTrialOrder === 1;
      const eventIndex =
        input.eventIndex ??
        getSessionEventIndex(
          state.events,
          state.sessionId,
        );
      const phase = inferPhase(
        input,
        state.events,
        state.sessionId,
        taskId,
        trialNumber,
      );
      const currentTime =
        getCurrentTimeMs();
      const timestampIso =
        new Date().toISOString();
      const startedAt =
        storedMetadata?.startedAt ??
        (
          sameActiveTrial &&
          state.trialOrder > 0
            ? state.trialStartedAt
            : currentTime
        );
      const startedAtIso =
        storedMetadata?.startedAtIso ??
        (
          sameActiveTrial &&
          state.trialOrder > 0
            ? state.trialStartedAtIso ??
              timestampIso
            : timestampIso
        );
      const resolvedTrialId =
        normalizeTrialId(
          storedMetadata?.trialId ??
            (
              sameActiveTrial
                ? state.trialId
                : undefined
            ),
          taskId,
          trialNumber,
        );
      const taskDefinition =
        getStudyTaskDefinition(
          taskId,
        );
      const outerTaskNumber =
        getOuterTaskNumber(
          taskId,
        );
      const globalOptionNumber =
        getGlobalOptionNumber(
          taskId,
          trialNumber,
        );
      const elapsedMs =
        normalizedTrialOrder > 0
          ? Math.max(
              0,
              currentTime -
                startedAt,
            )
          : 0;

      const event = {
        ...input,
        eventId: createId(),
        eventIndex,
        participantId:
          state.participantId,
        participantToken:
          readInputParticipantToken(
            input,
          ) ??
          state.participantToken,
        sessionId:
          state.sessionId,
        trialId:
          resolvedTrialId,
        compositeTrialId:
          resolvedTrialId,
        trialNumber,
        trialOrder:
          normalizedTrialOrder,
        trialIndex:
          input.trialIndex ??
          globalOptionNumber,
        globalOptionNumber:
          input.globalOptionNumber ??
          globalOptionNumber,
        globalTrialNumber:
          input.globalTrialNumber ??
          globalOptionNumber,
        outerTaskNumber:
          input.outerTaskNumber ??
          outerTaskNumber,
        innerTaskNumber:
          input.innerTaskNumber ??
          trialNumber,
        taskId,
        skin:
          input.skin ??
          taskId,
        condition,
        conditionOrder,
        isFirstTrial,
        probeExposureNumber,
        probeNaive,
        taskInstanceVersion:
          input.taskInstanceVersion ??
          taskDefinition.taskVersion,
        appVersion:
          input.appVersion ??
          APP_VERSION,
        buildHash:
          input.buildHash?.trim() ||
          BUILD_HASH,
        eventType:
          input.eventType,
        phase,
        timestampIso,
        elapsedMs,
        tMs:
          input.tMs ??
          Math.max(
            0,
            currentTime -
              state.sessionStartedAt,
          ),
        resultingViolations:
          input.resultingViolations
            ? [
                ...input.resultingViolations,
              ]
            : undefined,
        unresolvedDemoTalkIds:
          cloneOptionalArray(
            input.unresolvedDemoTalkIds,
          ),
        unresolvedDemoTalkIdsBefore:
          cloneOptionalArray(
            input.unresolvedDemoTalkIdsBefore,
          ),
        unresolvedDemoTalkIdsAfter:
          cloneOptionalArray(
            input.unresolvedDemoTalkIdsAfter,
          ),
        unresolvedRequiredItemIds:
          cloneOptionalArray(
            input.unresolvedRequiredItemIds,
          ),
        unresolvedRequiredItemIdsBefore:
          cloneOptionalArray(
            input.unresolvedRequiredItemIdsBefore,
          ),
        unresolvedRequiredItemIdsAfter:
          cloneOptionalArray(
            input.unresolvedRequiredItemIdsAfter,
          ),
        metadata: {
          ...(input.metadata
            ? {
                ...input.metadata,
              }
            : {}),
          taskId,
          compositeTrialId:
            resolvedTrialId,
          outerTaskNumber,
          innerTaskNumber:
            trialNumber,
          globalOptionNumber,
          globalTrialNumber:
            globalOptionNumber,
          trialStartedAtIso:
            normalizedTrialOrder > 0
              ? startedAtIso
              : null,
          sessionStartedAtIso:
            state.sessionStartedAtIso,
        },
        payload:
          input.payload
            ? {
                ...input.payload,
              }
            : undefined,
      } satisfies StudyEvent;

      set((currentState) => {
        const shouldStoreTrialMetadata =
          normalizedTrialOrder > 0;
        const metadataAlreadyStored =
          currentState.trialMetadata[
            trialKey
          ];
        const nextTrialMetadata =
          shouldStoreTrialMetadata &&
          !metadataAlreadyStored
            ? {
                ...currentState.trialMetadata,
                [trialKey]: {
                  ...defaultMetadata,
                  trialId:
                    resolvedTrialId,
                  trialOrder:
                    normalizedTrialOrder,
                  conditionOrder,
                  isFirstTrial,
                  probeExposureNumber,
                  probeNaive,
                  startedAt,
                  startedAtIso,
                },
              }
            : currentState.trialMetadata;
        const eventStartsTrial =
          input.eventType ===
            "trial_start" &&
          normalizedTrialOrder > 0;

        return {
          events: [
            ...currentState.events,
            event,
          ],
          trialMetadata:
            nextTrialMetadata,
          ...(eventStartsTrial
            ? {
                taskId,
                trialId:
                  resolvedTrialId,
                trialNumber,
                trialOrder:
                  normalizedTrialOrder,
                condition,
                conditionOrder,
                isFirstTrial,
                probeExposureNumber,
                probeNaive,
                trialStartedAt:
                  startedAt,
                trialStartedAtIso:
                  startedAtIso,
              }
            : {}),
        };
      });

      console.log(
        "[STUDY EVENT]",
        event,
      );

      return event;
    },

    getEventsForTrial: (
      trialNumber,
      requestedTaskId,
    ) => {
      const state = get();
      const taskId = resolveTaskId(
        requestedTaskId,
        state.taskId,
      );

      return state.events
        .filter(
          (event) =>
            event.sessionId === state.sessionId &&
            getEventTaskId(event) === taskId &&
            event.trialNumber === trialNumber,
        )
        .sort(
          (first, second) =>
            (first.tMs ?? first.elapsedMs) -
              (second.tMs ?? second.elapsedMs) ||
            first.eventIndex - second.eventIndex,
        );
    },

    clearEvents: () => {
      /*
       * Deliberately append-only. Existing callers may still call this
       * between trials, but deleting prior events would violate the
       * full-session logging requirement.
       */
    },

    clearAllEvents: () => {
      /*
       * The event stream is append-only within a participant session.
       * resetForNewParticipant is the only supported destructive reset.
       */
    },

    resetForNewParticipant: (input) => {
      set(createInitialState(input));
    },

    exportEvents: (
      trialNumber,
      requestedTaskId,
    ) => {
      const state = get();
      const probeNaiveTrialIds = new Set(
        state.events
          .filter(
            (event) =>
              event.participantId === state.participantId &&
              event.probeNaive,
          )
          .map((event) => event.trialId),
      );

      if (probeNaiveTrialIds.size > 1) {
        throw new Error(
          `Participant ${state.participantId} has more than one probe-naive trial.`,
        );
      }

      const taskId = resolveTaskId(
        requestedTaskId,
        state.taskId,
      );
      const events = state.events
        .filter(
          (event) =>
            event.sessionId ===
              state.sessionId &&
            getEventTaskId(event) ===
              taskId &&
            event.phase !==
              "session" &&
            event.phase !==
              "consent" &&
            (
              trialNumber ===
                undefined ||
              event.trialNumber ===
                trialNumber
            ),
        )
        .sort(
          (first, second) =>
            (
              first.tMs ??
              first.elapsedMs
            ) -
              (
                second.tMs ??
                second.elapsedMs
              ) ||
            first.eventIndex -
              second.eventIndex,
        );

      return serializeEventsCsv(
        events,
      );
    },

    downloadEvents: (
      trialNumber,
      requestedTaskId,
    ) => {
      const state = get();
      const safeParticipant =
        sanitizeFilePart(
          state.participantToken,
        );
      const taskId = resolveTaskId(
        requestedTaskId,
        state.taskId,
      );
      const fileName =
        trialNumber === undefined
          ? `${safeParticipant}_${taskId}_event.csv`
          : `${safeParticipant}_${taskId}_T${trialNumber}_${getConditionForTrial(
              trialNumber,
            )}_event.csv`;

      downloadTextFile(
        fileName,
        state.exportEvents(
          trialNumber,
          taskId,
        ),
        "text/csv;charset=utf-8",
      );
    },

  }));
