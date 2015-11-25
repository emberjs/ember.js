import { LinkedList } from 'glimmer-util';
import { Reference } from 'glimmer-reference';

type Check = () => void;

export class Batcher extends LinkedList<[ Reference, Check ]> {
  watch(reference: Reference, callback: Check) {
    this.append([ reference, callback ]);
  }

  sweep() {
    this.forEach(([ref, check]) => {
      if (ref.isDirty()) check();
    });
  }
}
