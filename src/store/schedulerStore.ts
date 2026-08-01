import { create } from "zustand";

import {
  ROOM_DETAILS,
  TALKS,
  getInitialPlacements,
  getTalkById,
} from "../data/symposium";

import {
  DEFAULT_CONDITION_ORDER,
  getConditionForTrial,
} from "../types/scheduler";

import type {
  ConcretizationLevel,
  ConditionOrder,
  DragOrigin,
  IllegalMoveReason,
  MoveValidationResult,
  Placement,
  ScheduleMoveAction,
  Room,
  Slot,
  StudyTrialNumber,
  StudyTrialOrder,
} from "../types/scheduler";

interface ScheduleState {
  level: ConcretizationLevel;
  trialNumber: StudyTrialNumber;
  trialOrder: StudyTrialOrder;
  conditionOrder: ConditionOrder;
  placements: Placement[];
  unassignedTalkIds: string[];
  activeTalkId: string | null;
  activeDragOrigin: DragOrigin | null;
  scheduleRevision: number;
  allowTrayUnplace: boolean;
  trialLocked: boolean;
}

interface SchedulerStore extends ScheduleState {
  setActiveTalkId: (talkId: string | null) => void;
  setActiveDragOrigin: (origin: DragOrigin | null) => void;
  setAllowTrayUnplace: (allowed: boolean) => void;
  setTrialLocked: (locked: boolean) => void;

  initializeTrial: (
    trialNumber: StudyTrialNumber,
    conditionOrder?: ConditionOrder,
    trialOrder?: StudyTrialOrder,
  ) => void;

  initializeSchedule: (
    level: ConcretizationLevel,
    trialNumber?: StudyTrialNumber,
    trialOrder?: StudyTrialOrder,
    conditionOrder?: ConditionOrder,
  ) => void;

  setLevel: (level: ConcretizationLevel) => void;
  resetSchedule: () => void;
  resetForNewParticipant: () => void;
  getPlacementsSnapshot: () => Placement[];

  validateMoveOrSwapTalk: (
    talkId: string,
    targetRoom: Room,
    targetSlot: Slot,
  ) => MoveValidationResult;

  canMoveOrSwapTalk: (
    talkId: string,
    targetRoom: Room,
    targetSlot: Slot,
  ) => boolean;

  moveOrSwapTalk: (
    talkId: string,
    targetRoom: Room,
    targetSlot: Slot,
  ) => boolean;

  unassignTalk: (talkId: string) => boolean;
}

const INITIAL_TRIAL_NUMBER: StudyTrialNumber = 1;
const INITIAL_TRIAL_ORDER: StudyTrialOrder = 1;

/*
 * Keeping this false preserves the verified swap neighborhood for the
 * fully populated AI artifact. It can still be changed through the
 * existing setter when a pilot configuration requires tray unplacement.
 */
const DEFAULT_ALLOW_TRAY_UNPLACE = false;

function clonePlacements(
  placements: Placement[],
): Placement[] {
  return placements.map((placement) => ({
    ...placement,
  }));
}

function sortPlacements(
  placements: Placement[],
): Placement[] {
  return [...placements].sort((first, second) => {
    const roomComparison =
      first.room.localeCompare(second.room);

    if (roomComparison !== 0) {
      return roomComparison;
    }

    if (first.slot !== second.slot) {
      return first.slot - second.slot;
    }

    return first.talkId.localeCompare(
      second.talkId,
    );
  });
}

function getUnassignedTalkIds(
  placements: Placement[],
): string[] {
  const assignedTalkIds = new Set(
    placements.map(
      (placement) => placement.talkId,
    ),
  );

  return TALKS.filter(
    (talk) => !assignedTalkIds.has(talk.id),
  ).map((talk) => talk.id);
}

function getTrialOrderForCondition(
  level: ConcretizationLevel,
  conditionOrder: ConditionOrder,
): StudyTrialOrder {
  const index = conditionOrder.indexOf(level);

  if (index < 0) {
    throw new Error(
      `Condition ${level} is missing from order ${conditionOrder}.`,
    );
  }

  return (index + 1) as StudyTrialOrder;
}

function createScheduleState(
  level: ConcretizationLevel,
  trialNumber: StudyTrialNumber,
  trialOrder: StudyTrialOrder,
  conditionOrder: ConditionOrder,
  scheduleRevision = 0,
  allowTrayUnplace = DEFAULT_ALLOW_TRAY_UNPLACE,
): ScheduleState {
  const placements = sortPlacements(
    clonePlacements(
      getInitialPlacements(level),
    ),
  );

  return {
    level,
    trialNumber,
    trialOrder,
    conditionOrder,
    placements,
    unassignedTalkIds:
      getUnassignedTalkIds(placements),
    activeTalkId: null,
    activeDragOrigin: null,
    scheduleRevision,
    allowTrayUnplace,
    trialLocked: false,
  };
}

function createTrialScheduleState(
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrder =
    DEFAULT_CONDITION_ORDER,
  trialOrder?: StudyTrialOrder,
  scheduleRevision = 0,
  allowTrayUnplace = DEFAULT_ALLOW_TRAY_UNPLACE,
): ScheduleState {
  const level = getConditionForTrial(trialNumber);
  const resolvedTrialOrder =
    trialOrder ??
    getTrialOrderForCondition(
      level,
      conditionOrder,
    );

  return createScheduleState(
    level,
    trialNumber,
    resolvedTrialOrder,
    conditionOrder,
    scheduleRevision,
    allowTrayUnplace,
  );
}

function getPlacementForTalk(
  placements: Placement[],
  talkId: string,
): Placement | undefined {
  return placements.find(
    (placement) => placement.talkId === talkId,
  );
}

function getPlacementAtCell(
  placements: Placement[],
  room: Room,
  slot: Slot,
): Placement | undefined {
  return placements.find(
    (placement) =>
      placement.room === room &&
      placement.slot === slot,
  );
}

function getIllegalPlacementReason(
  talkId: string,
  room: Room,
  slot: Slot,
  displaced = false,
): IllegalMoveReason | undefined {
  const talk = getTalkById(talkId);

  if (!talk) {
    return "talk_not_found";
  }

  if (!talk.allowedRooms.includes(room)) {
    if (
      talk.demo &&
      !ROOM_DETAILS[room].hasProjector
    ) {
      return displaced
        ? "displaced_talk_projector_required"
        : "target_projector_required";
    }

    if (
      talk.id === "N3" &&
      ROOM_DETAILS[room].capacity < 80
    ) {
      return displaced
        ? "displaced_talk_capacity_insufficient"
        : "target_capacity_insufficient";
    }

    return displaced
      ? "displaced_talk_room_not_allowed"
      : "target_room_not_allowed";
  }

  if (!talk.allowedSlots.includes(slot)) {
    return displaced
      ? "displaced_talk_slot_not_allowed"
      : "target_slot_not_allowed";
  }

  return undefined;
}

function placementsAreEqual(
  first: Placement[],
  second: Placement[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((placement) => {
    const matchingPlacement =
      getPlacementForTalk(
        second,
        placement.talkId,
      );

    return (
      matchingPlacement?.room ===
        placement.room &&
      matchingPlacement.slot === placement.slot
    );
  });
}

function clearDragState(): Pick<
  ScheduleState,
  "activeTalkId" | "activeDragOrigin"
> {
  return {
    activeTalkId: null,
    activeDragOrigin: null,
  };
}

const initialState = createTrialScheduleState(
  INITIAL_TRIAL_NUMBER,
  DEFAULT_CONDITION_ORDER,
  INITIAL_TRIAL_ORDER,
);

export const useSchedulerStore =
  create<SchedulerStore>((set, get) => ({
    ...initialState,

    setActiveTalkId: (talkId) => {
      if (
        talkId !== null &&
        !getTalkById(talkId)
      ) {
        return;
      }

      if (talkId === null) {
        set(clearDragState());
        return;
      }

      const origin: DragOrigin =
        getPlacementForTalk(
          get().placements,
          talkId,
        )
          ? "grid"
          : "tray";

      set({
        activeTalkId: talkId,
        activeDragOrigin: origin,
      });
    },

    setActiveDragOrigin: (origin) => {
      set({ activeDragOrigin: origin });
    },

    setAllowTrayUnplace: (allowed) => {
      set({ allowTrayUnplace: allowed });
    },

    setTrialLocked: (locked) => {
      set({
        trialLocked: locked,
        ...(locked ? clearDragState() : {}),
      });
    },

    initializeTrial: (
      trialNumber,
      conditionOrder = DEFAULT_CONDITION_ORDER,
      trialOrder,
    ) => {
      const state = get();

      set(
        createTrialScheduleState(
          trialNumber,
          conditionOrder,
          trialOrder,
          state.scheduleRevision + 1,
          state.allowTrayUnplace,
        ),
      );
    },

    initializeSchedule: (
      level,
      trialNumber,
      trialOrder,
      conditionOrder,
    ) => {
      const state = get();
      const resolvedConditionOrder =
        conditionOrder ?? state.conditionOrder;
      const resolvedTrialNumber =
        trialNumber ?? state.trialNumber;
      const resolvedTrialOrder =
        trialOrder ??
        getTrialOrderForCondition(
          level,
          resolvedConditionOrder,
        );

      set(
        createScheduleState(
          level,
          resolvedTrialNumber,
          resolvedTrialOrder,
          resolvedConditionOrder,
          state.scheduleRevision + 1,
          state.allowTrayUnplace,
        ),
      );
    },

    setLevel: (level) => {
      const state = get();

      set(
        createScheduleState(
          level,
          state.trialNumber,
          getTrialOrderForCondition(
            level,
            state.conditionOrder,
          ),
          state.conditionOrder,
          state.scheduleRevision + 1,
          state.allowTrayUnplace,
        ),
      );
    },

    resetSchedule: () => {
      const state = get();

      set(
        createTrialScheduleState(
          state.trialNumber,
          state.conditionOrder,
          state.trialOrder,
          state.scheduleRevision + 1,
          state.allowTrayUnplace,
        ),
      );
    },

    resetForNewParticipant: () => {
      set(
        createTrialScheduleState(
          INITIAL_TRIAL_NUMBER,
          DEFAULT_CONDITION_ORDER,
          INITIAL_TRIAL_ORDER,
          0,
          DEFAULT_ALLOW_TRAY_UNPLACE,
        ),
      );
    },

    getPlacementsSnapshot: () =>
      clonePlacements(get().placements),

    validateMoveOrSwapTalk: (
      talkId,
      targetRoom,
      targetSlot,
    ) => {
      const state = get();
      const sourcePlacement =
        getPlacementForTalk(
          state.placements,
          talkId,
        );
      const targetPlacement =
        getPlacementAtCell(
          state.placements,
          targetRoom,
          targetSlot,
        );
      const action: ScheduleMoveAction =
        targetPlacement &&
        targetPlacement.talkId !== talkId
          ? "swap"
          : "move";

      const resultBase: Omit<
        MoveValidationResult,
        "valid" | "reason"
      > = {
        action,
        talkId,
        target: {
          room: targetRoom,
          slot: targetSlot,
        },
        displacedTalkId:
          action === "swap"
            ? targetPlacement?.talkId
            : undefined,
      };

      if (state.trialLocked) {
        return {
          ...resultBase,
          valid: false,
          reason: "trial_locked",
        };
      }

      if (!getTalkById(talkId)) {
        return {
          ...resultBase,
          valid: false,
          reason: "talk_not_found",
        };
      }

      const sourceIsTray =
        state.unassignedTalkIds.includes(talkId);

      if (!sourcePlacement && !sourceIsTray) {
        return {
          ...resultBase,
          valid: false,
          reason: "source_not_found",
        };
      }

      const targetReason =
        getIllegalPlacementReason(
          talkId,
          targetRoom,
          targetSlot,
        );

      if (targetReason) {
        return {
          ...resultBase,
          valid: false,
          reason: targetReason,
        };
      }

      if (
        sourcePlacement?.room === targetRoom &&
        sourcePlacement.slot === targetSlot
      ) {
        return {
          ...resultBase,
          valid: true,
        };
      }

      if (!targetPlacement) {
        return {
          ...resultBase,
          valid: true,
        };
      }

      if (!sourcePlacement) {
        return {
          ...resultBase,
          valid: false,
          reason: "source_not_found",
        };
      }

      const displacedReason =
        getIllegalPlacementReason(
          targetPlacement.talkId,
          sourcePlacement.room,
          sourcePlacement.slot,
          true,
        );

      if (displacedReason) {
        return {
          ...resultBase,
          valid: false,
          reason: displacedReason,
        };
      }

      return {
        ...resultBase,
        valid: true,
      };
    },

    canMoveOrSwapTalk: (
      talkId,
      targetRoom,
      targetSlot,
    ) =>
      get().validateMoveOrSwapTalk(
        talkId,
        targetRoom,
        targetSlot,
      ).valid,

    moveOrSwapTalk: (
      talkId,
      targetRoom,
      targetSlot,
    ) => {
      const state = get();
      const validation =
        state.validateMoveOrSwapTalk(
          talkId,
          targetRoom,
          targetSlot,
        );

      if (!validation.valid) {
        set(clearDragState());
        return false;
      }

      const sourcePlacement =
        getPlacementForTalk(
          state.placements,
          talkId,
        );
      const targetPlacement =
        getPlacementAtCell(
          state.placements,
          targetRoom,
          targetSlot,
        );

      if (
        sourcePlacement?.room === targetRoom &&
        sourcePlacement.slot === targetSlot
      ) {
        set(clearDragState());
        return true;
      }

      let nextPlacements: Placement[];

      if (!targetPlacement) {
        nextPlacements = state.placements
          .filter(
            (placement) =>
              placement.talkId !== talkId,
          )
          .map((placement) => ({
            ...placement,
          }));

        nextPlacements.push({
          talkId,
          room: targetRoom,
          slot: targetSlot,
        });
      } else {
        if (!sourcePlacement) {
          set(clearDragState());
          return false;
        }

        nextPlacements = state.placements.map(
          (placement) => {
            if (placement.talkId === talkId) {
              return {
                ...placement,
                room: targetRoom,
                slot: targetSlot,
              };
            }

            if (
              placement.talkId ===
              targetPlacement.talkId
            ) {
              return {
                ...placement,
                room: sourcePlacement.room,
                slot: sourcePlacement.slot,
              };
            }

            return { ...placement };
          },
        );
      }

      const normalizedPlacements =
        sortPlacements(nextPlacements);

      if (
        placementsAreEqual(
          state.placements,
          normalizedPlacements,
        )
      ) {
        set(clearDragState());
        return true;
      }

      set({
        placements: normalizedPlacements,
        unassignedTalkIds:
          getUnassignedTalkIds(
            normalizedPlacements,
          ),
        ...clearDragState(),
        scheduleRevision:
          state.scheduleRevision + 1,
      });

      return true;
    },

    unassignTalk: (talkId) => {
      const state = get();

      if (
        state.trialLocked ||
        !state.allowTrayUnplace
      ) {
        set(clearDragState());
        return false;
      }

      const sourcePlacement =
        getPlacementForTalk(
          state.placements,
          talkId,
        );

      if (!sourcePlacement) {
        set(clearDragState());
        return false;
      }

      const nextPlacements = sortPlacements(
        state.placements
          .filter(
            (placement) =>
              placement.talkId !== talkId,
          )
          .map((placement) => ({
            ...placement,
          })),
      );

      set({
        placements: nextPlacements,
        unassignedTalkIds:
          getUnassignedTalkIds(nextPlacements),
        ...clearDragState(),
        scheduleRevision:
          state.scheduleRevision + 1,
      });

      return true;
    },
  }));
