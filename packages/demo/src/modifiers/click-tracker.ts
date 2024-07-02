import Modifier from 'ember-modifier';
import { registerDestructor } from '@ember/destroyable';

function cleanup(instance: ClickTracker) {
  document.body.removeEventListener('click', instance.handler);
}

export default class ClickTracker extends Modifier {
  element!: Element;

  modify(element: Element) {
    this.element = element;

    document.body.addEventListener('click', this.handler);

    registerDestructor(this, cleanup);
  }

  handler = (e: Event) => {
    const place = this.element.contains(e.target as Element)
      ? 'inside'
      : 'outside';

    console.log(`Click ${place} ${this.element}`);
  };
}
