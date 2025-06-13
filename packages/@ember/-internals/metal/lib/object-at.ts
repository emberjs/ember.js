/** @deprecated Use `array[index]` instead. */
export function objectAt<T>(array: readonly T[], index: number): T | undefined {
  return array[index];
}
