import {
  // @ts-ignore
  next,
  run,
} from '@ember/runloop';

import { Promise } from 'rsvp';

export function runAppend(view: any) {
  run(view, 'appendTo', document.getElementById('qunit-fixture'));
}

export function runDestroy(toDestroy: any) {
  if (toDestroy) {
    run(toDestroy, 'destroy');
  }
}

export function runTaskNext(): Promise<void> {
  return new Promise(resolve => {
    return next(resolve);
  });
}
