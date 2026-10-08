import type { IteratorDelegate } from '@glimmer/reference';
import { debug } from '@glimmer/validator';

/**
 * Clears the VM's tracking-transaction state between tests (a test that throws in the middle of a
 * tracking frame must not leak it into the next one).
 */
export function resetTrackingTransaction(): void {
  debug.resetTrackingTransaction?.();
}

export class NativeIteratorDelegate<T = unknown> implements IteratorDelegate {
  static from<T>(iterable: Iterable<T>) {
    let iterator = iterable[Symbol.iterator]();
    let result = iterator.next();
    let { done } = result;

    if (done) {
      return null;
    } else {
      return new this(iterator, result);
    }
  }

  private position = 0;

  constructor(
    private iterable: Iterator<T>,
    private result: IteratorResult<T>
  ) {}

  isEmpty(): false {
    return false;
  }

  next() {
    let { iterable, result } = this;

    let { value, done } = result;

    if (done === true) {
      return null;
    }

    let memo = this.position++;
    this.result = iterable.next();

    return { value, memo };
  }
}
