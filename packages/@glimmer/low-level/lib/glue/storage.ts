export type Opaque = {} | null | undefined;

export class Storage {
  private readonly array: Opaque[] = [];
  private next = 0;

  add(element: Opaque): number {
    let { next: slot, array } = this;

    if (slot === array.length) {
      this.next++;
    } else {
      let prev = array[slot] as number;
      this.next = prev;
    }

    this.array[slot] = element;
    return slot;
  }

  deref(pointer: number): Opaque {
    return this.array[pointer];
  }

  drop(pointer: number): void {
    this.array[pointer] = this.next;
    this.next = pointer;
  }
}
