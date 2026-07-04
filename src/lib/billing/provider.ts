/**
 * VAS (carrier billing) provider abstraction.
 *
 * The game only ever talks to this interface. Adapter #1 is the mock
 * (development) provider; the production VAS aggregator drops in behind
 * the same contract, and card rails (Paystack) can be added later.
 */

export type SubscriptionPlan = "daily" | "weekly" | "monthly";

export type Carrier = "mtn" | "airtel" | "glo" | "9mobile" | "unknown";

export interface InitiateSubscriptionInput {
  msisdn: string; // E.164
  plan: SubscriptionPlan;
  userId: string;
}

export interface InitiateSubscriptionResult {
  providerRef: string;
  /** How the user confirms consent (NCC-compliant double opt-in). */
  consentMethod: "otp" | "ussd" | "redirect";
  consentHint: string; // e.g. "Enter the OTP sent to your phone"
}

export type BillingEventType =
  | "consent"
  | "charge_success"
  | "charge_failed"
  | "cancel"
  | "unknown";

export interface ParsedBillingEvent {
  providerEventId: string;
  providerRef: string;
  type: BillingEventType;
  msisdn: string;
  amountMinor?: number;
  occurredAt: string;
  raw: unknown;
}

export interface BillingProvider {
  readonly key: string;
  detectCarrier(msisdn: string): Carrier;
  initiateSubscription(
    input: InitiateSubscriptionInput,
  ): Promise<InitiateSubscriptionResult>;
  confirmConsent(providerRef: string, otp: string): Promise<boolean>;
  cancel(providerRef: string): Promise<void>;
  /** MUST verify signature before parsing. Refuse-by-default. */
  verifyWebhook(rawBody: string, headers: Headers): boolean;
  parseEvent(rawBody: string): ParsedBillingEvent;
}
