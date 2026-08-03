import type { ConfirmChannel } from "amqplib";
import type { AckType } from "../internal/pubsub/subscribeJSON.js";
import {
  ExchangePerilTopic,
  WarRecognitionsPrefix,
} from "../internal/routing/routing.js";
import { publishJSON } from "../internal/pubsub/publish.js";

import type {
  ArmyMove,
  RecognitionOfWar,
} from "../internal/gamelogic/gamedata.js";
import type {
  GameState,
  PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { handleMove } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { MoveOutcome } from "../internal/gamelogic/move.js";
import { WarOutcome, handleWar } from "../internal/gamelogic/war.js";
import { publishGameLog } from "./index.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
  return function (ps: PlayingState): AckType {
    handlePause(gs, ps);
    process.stdout.write("> ");

    return "Ack";
  };
}

export function handlerMove(
  gs: GameState,
  ch: ConfirmChannel,
): (move: ArmyMove) => Promise<AckType> {
  return async function (move: ArmyMove): Promise<AckType> {
    const outcome = handleMove(gs, move);

    const username = gs.getUsername();

    process.stdout.write("> ");

    if (outcome === MoveOutcome.Safe) {
      return "Ack";
    }

    if (outcome == MoveOutcome.MakeWar) {
      const rw: RecognitionOfWar = {
        attacker: move.player,
        defender: gs.getPlayerSnap(),
      };

      try {
        await publishJSON(
          ch,
          ExchangePerilTopic,
          `${WarRecognitionsPrefix}.${username}`,
          rw,
        );
        return "Ack";
      } catch (e) {
        console.log(e);
        return "NackRequeue";
      }
    }

    if (outcome === MoveOutcome.SamePlayer) {
      return "NackDiscard";
    }

    return "NackDiscard";
  };
}

export function handlerWar(
  gs: GameState,
  ch: ConfirmChannel,
): (rw: RecognitionOfWar) => Promise<AckType> {
  return async function (rw: RecognitionOfWar): Promise<AckType> {
    const outcome = handleWar(gs, rw).result;

    process.stdout.write("> ");

    if (outcome == WarOutcome.NotInvolved) {
      return "NackRequeue";
    }

    if (outcome == WarOutcome.NoUnits) {
      return "NackDiscard";
    }

    try {
      if (outcome == WarOutcome.OpponentWon) {
        await publishGameLog(
          ch,
          gs.getUsername(),
          `${rw.defender.username} won a war against ${rw.attacker.username}`,
        );

        return "Ack";
      }

      if (outcome == WarOutcome.YouWon) {
        await publishGameLog(
          ch,
          gs.getUsername(),
          `${rw.attacker.username} won a war against ${rw.defender.username}`,
        );

        return "Ack";
      }

      if (outcome == WarOutcome.Draw) {
        await publishGameLog(
          ch,
          gs.getUsername(),
          `A war between ${rw.attacker.username} and ${rw.defender.username} resulted in a draw`,
        );

        return "Ack";
      }
    } catch (e) {
      console.error(e);
      return "NackRequeue";
    }

    console.log(outcome);

    return "NackDiscard";
  };
}
