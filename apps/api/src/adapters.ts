import { createHmac, timingSafeEqual } from 'node:crypto';
export interface PaymentAdapter {
  createSession(orderId: string, amount: number): Promise<{ id: string; provider: string }>;
  refund(id: string, amount: number): Promise<void>;
  verify(raw: Buffer, signature: string): boolean;
}
export interface POSAdapter {
  submit(
    order: { id: string; total: number; items: any[] },
    idempotencyKey: string,
  ): Promise<{ reference: string; accepted: boolean }>;
}
export const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('hex');
export const equal = (a: string, b: string) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export class MockPayment implements PaymentAdapter {
  constructor(private secret: string) {}
  async createSession(orderId: string, _amount: number) {
    return { id: `mock_${orderId}`, provider: 'mock' };
  }
  async refund(_id: string, _amount: number) {}
  verify(raw: Buffer, signature: string) {
    return equal(sign(raw.toString(), this.secret), signature);
  }
}
export class MockPOS implements POSAdapter {
  failNext = false;
  async submit(order: { id: string; total: number; items: any[] }, idempotencyKey: string) {
    if (this.failNext) {
      this.failNext = false;
      throw Error('Simulated POS unavailable');
    }
    return { reference: `MOCK-${idempotencyKey}`, accepted: false };
  }
}
