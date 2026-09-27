/**
 *
 * https://github.com/emberjs/rfcs/pull/1071
 *
 * Needed for equality-based dirty checking, rather than identity-based.
 */
import { consumeTag, createUpdatableTag, dirtyTag } from '@glimmer/validator';

export function cell(initial, options = { equals: Object.is }) {
  return new Cell(initial, options);
}

class Cell {
  #value;
  #equals;
  #tag;

  constructor(value, options) {
    this.#value = value;
    this.#equals = options.equals;
    this.#tag = createUpdatableTag();
  }

  get current() {
    consumeTag(this.#tag);

    return this.#value;
  }

  read() {
    consumeTag(this.#tag);

    return this.#value;
  }

  set(value) {
    if (this.#equals?.(this.#value, value)) {
      return false;
    }

    this.#value = value;

    dirtyTag(this.#tag);

    return true;
  }

  update(updater) {
    this.set(updater(this.#value));
  }
}