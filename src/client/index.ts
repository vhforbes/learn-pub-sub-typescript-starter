import { connect } from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
} from "../internal/gamelogic/gamelogic.js";

import {
  ArmyMovesPrefix,
  ExchangePerilDirect,
  ExchangePerilTopic,
  PauseKey,
} from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { subscribeJSON } from "../internal/pubsub/subscribeJSON.js";
import { handlerMove, handlerPause } from "./handlers.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { SimpleQueueType } from "../internal/pubsub/declareAndBind.js";

async function main() {
  console.log("Starting Peril client...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";

  const conn = await connect(rabbitConnString);

  const username = await clientWelcome();

  const game = new GameState(username);

  const ch = await conn.createConfirmChannel();

  await subscribeJSON(
    conn,
    ExchangePerilDirect,
    `${PauseKey}.${username}`,
    PauseKey,
    SimpleQueueType.Transient,
    handlerPause(game),
  );

  await subscribeJSON(
    conn,
    ExchangePerilTopic,
    `${ArmyMovesPrefix}.${username}`,
    `${ArmyMovesPrefix}.*`,
    SimpleQueueType.Transient,
    handlerMove(game),
  );

  while (true) {
    const input = await getInput();

    if (input[0] === "spawn") {
      commandSpawn(game, input);
    } else if (input[0] === "move") {
      const armyMove = commandMove(game, input);
      await publishJSON(
        ch,
        ExchangePerilTopic,
        `${ArmyMovesPrefix}.${username}`,
        armyMove,
      );
      console.log("move published successfully");
    } else if (input[0] === "status") {
      commandStatus(game);
    } else if (input[0] === "help") {
      printClientHelp();
    } else if (input[0] === "spam") {
      console.log("Spamming not allowed yet!");
    } else if (input[0] === "quit") {
      console.log("Exiting...");
      break;
    } else {
      console.log(input[0], "is not a valid command");
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
