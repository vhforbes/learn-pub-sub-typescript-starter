import type { ConfirmChannel } from "amqplib";
import { encode } from "@msgpack/msgpack";

export async function publishJSON<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const serializedValue = Buffer.from(JSON.stringify(value));

  ch.publish(exchange, routingKey, serializedValue, {
    contentType: "application/json",
  });
}

export async function publishMsgPack<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const serializedValue = Buffer.from(encode(value));

  ch.publish(exchange, routingKey, serializedValue, {
    contentType: "application/x-msgpack",
  });
}
