import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";

async function main() {
  console.log("Starting Peril server...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);

  console.log("Connection to rabbit successful");

  const ch = await conn.createConfirmChannel();

  await publishJSON(ch, ExchangePerilDirect, PauseKey, {
    isPaused: true,
  });

  process.on("SIGINT", () => {
    conn.close();
    console.log("Closed connection");
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
