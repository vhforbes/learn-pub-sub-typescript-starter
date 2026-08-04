import amqp from "amqplib";
import { declareAndBind, type SimpleQueueType } from "./declareAndBind.js";

export type AckType = "Ack" | "NackRequeue" | "NackDiscard";

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
  const [ch, assertQueue] = await declareAndBind(
    conn,
    exchange,
    queueName,
    key,
    queueType,
  );

  ch.consume(assertQueue.queue, async (message: amqp.ConsumeMessage | null) => {
    if (!message) return;

    const parsedMessage = JSON.parse(message.content.toString());

    const ack = await handler(parsedMessage);

    switch (ack) {
      case "Ack":
        ch.ack(message);
        console.log("ack", message);
        break;
      case "NackRequeue":
        ch.nack(message, false, true);
        console.log("NackRequeue", message);
        break;
      case "NackDiscard":
        ch.nack(message, false, false);
        console.log("NackDiscard", message);
        break;
    }
  });
}
