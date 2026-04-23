import type { Channel, ChannelModel } from "amqplib";
import amqp from "amqplib";
import type { Logger } from "pino";

const TXN_EXCHANGE = "banking.events";
const TXN_ROUTING_KEY = "txn.created";

export interface TxnCreatedPayload {
  txn_id: string;
  account_id: string;
  amount: string;
  txn_type: string;
  reference: string;
  created_at: string;
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface TxnEventPublisher {
  connect(): Promise<void>;
  close(): Promise<void>;
  publishTxnCreated(payload: TxnCreatedPayload): Promise<void>;
}

export class RabbitMqPublisher implements TxnEventPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(
    private readonly url: string,
    private readonly logger: Logger,
  ) {}

  async connect(): Promise<void> {
    const conn = await amqp.connect(this.url);
    this.connection = conn;
    const ch = await conn.createChannel();
    await ch.assertExchange(TXN_EXCHANGE, "topic", { durable: true });
    this.channel = ch;
  }

  async close(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
  }

  async publishTxnCreated(payload: TxnCreatedPayload): Promise<void> {
    const ch = this.channel;
    if (!ch) {
      this.logger.error({ msg: "RabbitMQ channel not initialized" });
      return;
    }
    const body = Buffer.from(JSON.stringify(payload));
    ch.publish(TXN_EXCHANGE, TXN_ROUTING_KEY, body, { persistent: true, contentType: "application/json" });
  }
}

export class NullTxnEventPublisher implements TxnEventPublisher {
  async connect(): Promise<void> {}

  async close(): Promise<void> {}

  async publishTxnCreated(_payload: TxnCreatedPayload): Promise<void> {}
}
