export type HandleResult = { status: number; body?: unknown; session?: number | null; save?: boolean };
export type PasswordCrypto = {
  hash(password: string): Promise<Record<string, string>>;
  verify(password: string, user: Record<string, unknown>): Promise<boolean>;
};
export function emptyData(): Record<string, unknown> & { users: unknown[] };
export function handle(ctx: {
  data: Record<string, unknown>;
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  userId: number | null;
  crypto: PasswordCrypto;
}): Promise<HandleResult>;
export const CHANNELS: string[];
export const ORDER_STATUS: string[];
