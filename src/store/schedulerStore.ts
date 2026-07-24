import {
  create,
} from "zustand";

import {
  TALKS,
  getInitialPlacements,
  getInitialPlacementsForTrial,
  getTalkById,
} from "../data/symposium";

import {
  getConditionForTrial,
} from "../types/scheduler";

import type {
  ConcretizationLevel,
  Placement,
  Room,
  Slot,
  StudyTrialNumber,
} from "../types/scheduler";

interface ScheduleState {
  level:
    ConcretizationLevel;

  trialNumber:
    StudyTrialNumber;

  placements:
    Placement[];

  unassignedTalkIds:
    string[];

  activeTalkId:
    string | null;

  scheduleRevision:
    number;
}

interface SchedulerStore
  extends ScheduleState {
  setActiveTalkId: (
    talkId:
      string | null,
  ) => void;

  initializeTrial: (
    trialNumber:
      StudyTrialNumber,
  ) => void;

  initializeSchedule: (
    level:
      ConcretizationLevel,

    trialNumber?:
      StudyTrialNumber,
  ) => void;

  setLevel: (
    level:
      ConcretizationLevel,
  ) => void;

  resetSchedule:
    () => void;

  resetForNewParticipant:
    () => void;

  getPlacementsSnapshot:
    () => Placement[];

  canMoveOrSwapTalk: (
    talkId:
      string,

    targetRoom:
      Room,

    targetSlot:
      Slot,
  ) => boolean;

  moveOrSwapTalk: (
    talkId:
      string,

    targetRoom:
      Room,

    targetSlot:
      Slot,
  ) => boolean;

  unassignTalk: (
    talkId:
      string,
  ) => boolean;
}

const INITIAL_TRIAL_NUMBER:
  StudyTrialNumber = 1;

function clonePlacements(
  placements:
    Placement[],
): Placement[] {
  return placements.map(
    (placement) => ({
      ...placement,
    }),
  );
}

function sortPlacements(
  placements:
    Placement[],
): Placement[] {
  return [
    ...placements,
  ].sort(
    (
      first,
      second,
    ) => {
      const roomComparison =
        first.room.localeCompare(
          second.room,
        );

      if (
        roomComparison !==
        0
      ) {
        return roomComparison;
      }

      if (
        first.slot !==
        second.slot
      ) {
        return (
          first.slot -
          second.slot
        );
      }

      return first.talkId.localeCompare(
        second.talkId,
      );
    },
  );
}

function getUnassignedTalkIds(
  placements:
    Placement[],
): string[] {
  const assignedTalkIds =
    new Set(
      placements.map(
        (placement) =>
          placement.talkId,
      ),
    );

  return TALKS
    .filter(
      (talk) =>
        !assignedTalkIds.has(
          talk.id,
        ),
    )
    .map(
      (talk) =>
        talk.id,
    );
}

function createScheduleState(
  level:
    ConcretizationLevel,

  trialNumber:
    StudyTrialNumber,

  scheduleRevision =
    0,
): ScheduleState {
  const placements =
    sortPlacements(
      clonePlacements(
        getInitialPlacements(
          level,
        ),
      ),
    );

  return {
    level,

    trialNumber,

    placements,

    unassignedTalkIds:
      getUnassignedTalkIds(
        placements,
      ),

    activeTalkId:
      null,

    scheduleRevision,
  };
}

function createTrialScheduleState(
  trialNumber:
    StudyTrialNumber,

  scheduleRevision =
    0,
): ScheduleState {
  const level =
    getConditionForTrial(
      trialNumber,
    );

  const placements =
    sortPlacements(
      clonePlacements(
        getInitialPlacementsForTrial(
          trialNumber,
        ),
      ),
    );

  return {
    level,

    trialNumber,

    placements,

    unassignedTalkIds:
      getUnassignedTalkIds(
        placements,
      ),

    activeTalkId:
      null,

    scheduleRevision,
  };
}

function isStructurallyLegal(
  talkId:
    string,

  room:
    Room,

  slot:
    Slot,
): boolean {
  const talk =
    getTalkById(
      talkId,
    );

  if (
    !talk
  ) {
    return false;
  }

  return (
    talk.allowedRooms.includes(
      room,
    ) &&
    talk.allowedSlots.includes(
      slot,
    )
  );
}

function getPlacementForTalk(
  placements:
    Placement[],

  talkId:
    string,
): Placement | undefined {
  return placements.find(
    (placement) =>
      placement.talkId ===
      talkId,
  );
}

function getPlacementAtCell(
  placements:
    Placement[],

  room:
    Room,

  slot:
    Slot,
): Placement | undefined {
  return placements.find(
    (placement) =>
      placement.room ===
        room &&
      placement.slot ===
        slot,
  );
}

function placementsAreEqual(
  first:
    Placement[],

  second:
    Placement[],
): boolean {
  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  return first.every(
    (placement) => {
      const matchingPlacement =
        getPlacementForTalk(
          second,
          placement.talkId,
        );

      return (
        matchingPlacement?.room ===
          placement.room &&
        matchingPlacement.slot ===
          placement.slot
      );
    },
  );
}

const initialState =
  createTrialScheduleState(
    INITIAL_TRIAL_NUMBER,
  );

export const useSchedulerStore =
  create<SchedulerStore>(
    (
      set,
      get,
    ) => ({
      ...initialState,

      setActiveTalkId: (
        talkId,
      ) => {
        if (
          talkId !==
            null &&
          !getTalkById(
            talkId,
          )
        ) {
          return;
        }

        set({
          activeTalkId:
            talkId,
        });
      },

      initializeTrial: (
        trialNumber,
      ) => {
        const nextRevision =
          get()
            .scheduleRevision +
          1;

        set(
          createTrialScheduleState(
            trialNumber,
            nextRevision,
          ),
        );
      },

      initializeSchedule: (
        level,
        trialNumber,
      ) => {
        const state =
          get();

        const resolvedTrialNumber =
          trialNumber ??
          state.trialNumber;

        set(
          createScheduleState(
            level,
            resolvedTrialNumber,
            state.scheduleRevision +
              1,
          ),
        );
      },

      setLevel: (
        level,
      ) => {
        const state =
          get();

        set(
          createScheduleState(
            level,
            state.trialNumber,
            state.scheduleRevision +
              1,
          ),
        );
      },

      resetSchedule:
        () => {
          const state =
            get();

          set(
            createTrialScheduleState(
              state.trialNumber,
              state.scheduleRevision +
                1,
            ),
          );
        },

      resetForNewParticipant:
        () => {
          set(
            createTrialScheduleState(
              INITIAL_TRIAL_NUMBER,
              0,
            ),
          );
        },

      getPlacementsSnapshot:
        () =>
          clonePlacements(
            get().placements,
          ),

      canMoveOrSwapTalk: (
        talkId,
        targetRoom,
        targetSlot,
      ) => {
        const {
          placements,
        } = get();

        if (
          !isStructurallyLegal(
            talkId,
            targetRoom,
            targetSlot,
          )
        ) {
          return false;
        }

        const sourcePlacement =
          getPlacementForTalk(
            placements,
            talkId,
          );

        const targetPlacement =
          getPlacementAtCell(
            placements,
            targetRoom,
            targetSlot,
          );

        if (
          sourcePlacement?.room ===
            targetRoom &&
          sourcePlacement.slot ===
            targetSlot
        ) {
          return true;
        }

        if (
          !targetPlacement
        ) {
          return true;
        }

        if (
          !sourcePlacement
        ) {
          return false;
        }

        return isStructurallyLegal(
          targetPlacement.talkId,
          sourcePlacement.room,
          sourcePlacement.slot,
        );
      },

      moveOrSwapTalk: (
        talkId,
        targetRoom,
        targetSlot,
      ) => {
        const state =
          get();

        if (
          !state.canMoveOrSwapTalk(
            talkId,
            targetRoom,
            targetSlot,
          )
        ) {
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
          sourcePlacement?.room ===
            targetRoom &&
          sourcePlacement.slot ===
            targetSlot
        ) {
          set({
            activeTalkId:
              null,
          });

          return true;
        }

        let nextPlacements:
          Placement[];

        if (
          !targetPlacement
        ) {
          nextPlacements =
            state.placements
              .filter(
                (placement) =>
                  placement.talkId !==
                  talkId,
              )
              .map(
                (placement) => ({
                  ...placement,
                }),
              );

          nextPlacements.push({
            talkId,

            room:
              targetRoom,

            slot:
              targetSlot,
          });
        } else {
          if (
            !sourcePlacement
          ) {
            return false;
          }

          nextPlacements =
            state.placements.map(
              (placement) => {
                if (
                  placement.talkId ===
                  talkId
                ) {
                  return {
                    ...placement,

                    room:
                      targetRoom,

                    slot:
                      targetSlot,
                  };
                }

                if (
                  placement.talkId ===
                  targetPlacement.talkId
                ) {
                  return {
                    ...placement,

                    room:
                      sourcePlacement.room,

                    slot:
                      sourcePlacement.slot,
                  };
                }

                return {
                  ...placement,
                };
              },
            );
        }

        const normalizedPlacements =
          sortPlacements(
            nextPlacements,
          );

        if (
          placementsAreEqual(
            state.placements,
            normalizedPlacements,
          )
        ) {
          set({
            activeTalkId:
              null,
          });

          return true;
        }

        set({
          placements:
            normalizedPlacements,

          unassignedTalkIds:
            getUnassignedTalkIds(
              normalizedPlacements,
            ),

          activeTalkId:
            null,

          scheduleRevision:
            state.scheduleRevision +
            1,
        });

        return true;
      },

      unassignTalk: (
        talkId,
      ) => {
        const state =
          get();

        const sourcePlacement =
          getPlacementForTalk(
            state.placements,
            talkId,
          );

        if (
          !sourcePlacement
        ) {
          set({
            activeTalkId:
              null,
          });

          return false;
        }

        const nextPlacements =
          sortPlacements(
            state.placements
              .filter(
                (placement) =>
                  placement.talkId !==
                  talkId,
              )
              .map(
                (placement) => ({
                  ...placement,
                }),
              ),
          );

        set({
          placements:
            nextPlacements,

          unassignedTalkIds:
            getUnassignedTalkIds(
              nextPlacements,
            ),

          activeTalkId:
            null,

          scheduleRevision:
            state.scheduleRevision +
            1,
        });

        return true;
      },
    }),
  );