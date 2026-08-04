import { decode } from "@msgpack/msgpack";
import amqp from "amqplib";
import { declareAndBind, SimpleQueueType } from "./declareAndBind.js";
import { AckType } from "./subscribeJSON.js";

async function subscribe<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  simpleQueueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
  deserializer: (data: Buffer) => T,
): Promise<void> {
  const [ch, assertQueue] = await declareAndBind(
    conn,
    exchange,
    queueName,
    key,
    simpleQueueType,
  );

  console.log("declareAndBind ", ch, assertQueue);

  ch.consume(assertQueue.queue, async (message: amqp.ConsumeMessage | null) => {
    console.log("message ", message);

    if (!message) return;

    const parsedMessage = deserializer(message.content);

    const ack = await handler(parsedMessage);

    console.log("acktype ", ack);

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

export async function subscribeMsgPack<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  simpleQueueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
) {
  console.log("subscribeMsgPack called");

  await subscribe(
    conn,
    exchange,
    queueName,
    key,
    simpleQueueType,
    handler,
    decode,
  );
}
