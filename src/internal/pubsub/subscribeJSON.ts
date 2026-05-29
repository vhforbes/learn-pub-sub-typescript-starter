import amqp, { type Channel } from "amqplib";
import { declareAndBind, type SimpleQueueType } from "./declareAndBind.js";

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => void,
): Promise<void> {
  const [ch, assertQueue] = await declareAndBind(
    conn,
    exchange,
    queueName,
    key,
    queueType,
  );

  ch.consume(assertQueue.queue, (message: amqp.ConsumeMessage | null) => {
    if (!message) return;

    const parsedMessage = JSON.parse(message.content.toString());

    handler(parsedMessage);

    ch.ack(message);
  });
}
