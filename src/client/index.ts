import { connect } from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
} from "../internal/gamelogic/gamelogic.js";
import {
  declareAndBind,
  SimpleQueueType,
} from "../internal/pubsub/declareAndBind.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";

async function main() {
  console.log("Starting Peril client...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";

  const conn = await connect(rabbitConnString);

  const username = await clientWelcome();

  const [ch, replies] = await declareAndBind(
    conn,
    ExchangePerilDirect,
    `pause.${username}`,
    PauseKey,
    SimpleQueueType.Transient,
  );

  const game = new GameState(username);

  while (true) {
    const input = await getInput();

    if (input[0] === "spawn") {
      commandSpawn(game, input);
    } else if (input[0] === "move") {
      commandMove(game, input);
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
