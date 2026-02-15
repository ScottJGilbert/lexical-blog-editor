export default function invariant(
  cond?: boolean,
  message?: string,
  ...args: string[]
): asserts cond {
  if (cond) {
    return;
  }

  throw new Error(
    args.reduce((msg, arg) => msg.replace("%s", String(arg)), message || ""),
  );
}
