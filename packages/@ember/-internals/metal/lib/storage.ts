import { trackedData } from '@glimmer/validator';

interface Storage<Value> {
  /**
   * This is not a real property. Don't use it.
   * This is functioning as a brand-type for use with
   *   - createStorage
   *   - getValue
   *   - setValue
   *
   * from @glimmer/trcking/primitives/storage
   */
  __storage: Value;
}

export function createStorage<Value>(
  initialValue?: Value,
  isEqual?: (oldValue: Value, newValue: Value) => boolean
): Storage<Value> {}
export function getValue<Value>(storage: Storage<Value>): Value {}
export function setValue<Value>(storage: Storage<Value>, value: Value): void {}
