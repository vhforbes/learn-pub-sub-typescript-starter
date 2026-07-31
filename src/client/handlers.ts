import type { ArmyMove } from "../internal/gamelogic/gamedata.js";
import type {
  GameState,
  PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { handleMove } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import type { acktype } from "../internal/pubsub/subscribeJSON.js";
import { MoveOutcome } from "../internal/gamelogic/move.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => acktype {
  return function (ps: PlayingState): acktype {
    handlePause(gs, ps);
    process.stdout.write("> ");

    return "Ack";
  };
}

export function handlerMove(gs: GameState): (move: ArmyMove) => acktype {
  return function (move: ArmyMove): acktype {
    const outcome = handleMove(gs, move);

    process.stdout.write("> ");

    if (outcome === MoveOutcome.Safe || outcome === MoveOutcome.MakeWar) {
      return "Ack";
    }

    if (outcome === MoveOutcome.SamePlayer) {
      return "NackDiscard";
    }

    return "NackDiscard";
  };
}
