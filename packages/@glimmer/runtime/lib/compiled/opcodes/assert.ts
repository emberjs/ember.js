
import { Opaque } from "@glimmer/interfaces";

export function stackAssert(name: string, top: Opaque) {
  return `Expected top of stack to be ${name}, was ${String(top)}`;
}