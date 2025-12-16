export function stackAssert(name: string, top: unknown) {
  return `Expected top of stack to be ${name}, was ${String(top)}`;
}
