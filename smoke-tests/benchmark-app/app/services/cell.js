/**
 *
 * https://github.com/emberjs/rfcs/pull/1071
 *
 * Needed for equality-based dirty checking, rather than identity-based.
 */
import { tracked } from '@glimmer/tracking';

export function cell(initial, options = { equals: Object.is }) {
  return new Cell(initial, options);
}

class Cell {
  #value;

  constructor(value, options) {
    this.#value = tracked(value, options);
  }

  get current() {
    return this.#value.value;
  }

  read() {
    return this.#value.value;
  }

  set(value) {
    return this.#value.set(value);
  }

  update(updater) {
    this.#value.update(updater);
  }
}
