import { getElement } from './element-helpers';
import { runLoopSettled } from './run';

export function clickElement(selector: HTMLElement | string) {
  let element;
  if (typeof selector === 'string') {
    element = getElement().querySelector(selector) as HTMLElement | null;
  } else {
    element = selector;
  }

  let event = element!.click();

  return runLoopSettled(event);
}
