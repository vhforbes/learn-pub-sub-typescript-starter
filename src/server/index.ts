import amqp from "amqplib";
import { publishJSON, publishMsgPack } from "../internal/pubsub/publish.js";
import {
  ExchangePerilDirect,
  ExchangePerilTopic,
  GameLogSlug,
  PauseKey,
} from "../internal/routing/routing.js";
import { getInput, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import {
  declareAndBind,
  SimpleQueueType,
} from "../internal/pubsub/declareAndBind.js";
import { subscribeMsgPack } from "../internal/pubsub/consume.js";
import { writeLog, type GameLog } from "../internal/gamelogic/logs.js";
import { AckType } from "../internal/pubsub/subscribeJSON.js";

async function main() {
  console.log("Starting Peril server...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);

  console.log("Connection to rabbit successful");

  const ch = await conn.createConfirmChannel();

  await publishJSON(ch, ExchangePerilDirect, PauseKey, {
    isPaused: true,
  });

  await declareAndBind(
    conn,
    ExchangePerilTopic,
    GameLogSlug,
    GameLogSlug + ".*",
    SimpleQueueType.Durable,
  );

  await subscribeMsgPack(
    conn,
    ExchangePerilTopic,
    GameLogSlug,
    GameLogSlug + ".*",
    SimpleQueueType.Durable,
    async (gameLog: GameLog): Promise<AckType> => {
      await writeLog(gameLog);
      printServerHelp();
      return "Ack";
    },
  );

  printServerHelp();

  while (true) {
    const input = await getInput();

    if (input[0] === "pause") {
      console.log("sending pause message");

      await publishJSON(ch, ExchangePerilDirect, PauseKey, {
        isPaused: true,
      });
    } else if (input[0] === "resume") {
      console.log("sending resume message");

      await publishJSON(ch, ExchangePerilDirect, PauseKey, {
        isPaused: false,
      });
    } else if (input[0] === "quit") {
      console.log("exiting...");
      break;
    } else {
      console.log(input[0], "is not a valid command");
    }
  }

  process.on("SIGINT", () => {
    conn.close();
    console.log("Closed connection");
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
