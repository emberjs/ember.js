import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';

export class Cell<T> {
  #tag = createTag();
  #value: T;

  constructor(value: T) {
    this.#value = value;
  }

  get current() {
    consumeTag(this.#tag);
    return this.#value;
  }

  set current(value: T) {
    this.#value = value;
    dirtyTag(this.#tag);
  }
}
