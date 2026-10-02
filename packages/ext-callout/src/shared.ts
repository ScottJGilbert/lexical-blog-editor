/**
 * Shared by the editor and render halves. Must stay dependency-free so the
 * render half can run on servers and edge runtimes.
 */
export const CALLOUT_NODE_TYPE = "callout";

export const CALLOUT_KINDS = ["info", "tip", "warning", "danger"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

export function normalizeCalloutKind(value: unknown): CalloutKind {
  return (CALLOUT_KINDS as readonly unknown[]).includes(value) ? (value as CalloutKind) : "info";
}

/** The serialized (JSON) shape of a callout node. */
export interface SerializedCallout {
  type: typeof CALLOUT_NODE_TYPE;
  version: 1;
  kind: CalloutKind;
  children: unknown[];
  format?: string;
  indent?: number;
  direction?: "ltr" | "rtl" | null;
}
