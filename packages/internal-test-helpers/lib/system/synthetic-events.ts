import { run } from '@ember/runloop';
/* globals Element */

export const DEFAULT_EVENT_OPTIONS = { bubbles: true, cancelable: true };
export const KEYBOARD_EVENT_TYPES = ['keydown', 'keypress', 'keyup'] as const;
export const MOUSE_EVENT_TYPES = [
  'click',
  'mousedown',
  'mouseup',
  'dblclick',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
] as const;

export function matches(el: Element, selector: string) {
  return el.matches(selector);
}

function isFocusable(el: Element): el is HTMLElement {
  let focusableTags = ['INPUT', 'BUTTON', 'LINK', 'SELECT', 'A', 'TEXTAREA'];
  let { tagName, type } = el as HTMLInputElement;

  if (type === 'hidden') {
    return false;
  }

  return focusableTags.indexOf(tagName) > -1 || (el as HTMLElement).contentEditable === 'true';
}

export function click(el: HTMLElement | null | undefined, options = {}) {
  run(() => fireEvent(el, 'mousedown', options));
  focus(el);
  run(() => fireEvent(el, 'mouseup', options));
  run(() => fireEvent(el, 'click', options));
}

export function focus(el: Element | null | undefined) {
  if (!el) {
    return;
  }
  if (isFocusable(el)) {
    run(null, function () {
      let browserIsNotFocused = document.hasFocus && !document.hasFocus();

      // Firefox does not trigger the `focusin` event if the window
      // does not have focus. If the document doesn't have focus just
      // use trigger('focusin') instead.
      if (browserIsNotFocused) {
        fireEvent(el, 'focusin');
      }

      // makes `document.activeElement` be `el`. If the browser is focused, it also fires a focus event
      el.focus();

      // if the browser is not focused the previous `el.focus()` didn't fire an event, so we simulate it
      if (browserIsNotFocused) {
        fireEvent(el, 'focus');
      }
    });
  }
}

export function blur(el: Element) {
  if (isFocusable(el)) {
    run(null, function () {
      let browserIsNotFocused = document.hasFocus && !document.hasFocus();

      fireEvent(el, 'focusout');

      // makes `document.activeElement` be `body`.
      // If the browser is focused, it also fires a blur event
      el.blur();

      // Chrome/Firefox does not trigger the `blur` event if the window
      // does not have focus. If the document does not have focus then
      // fire `blur` event via native event.
      if (browserIsNotFocused) {
        fireEvent(el, 'blur');
      }
    });
  }
}

export function fireEvent<T extends keyof typeof KEYBOARD_EVENT_TYPES>(
  element: Element | null | undefined,
  type: T,
  options?: KeyboardEventInit
): void;
export function fireEvent<T extends keyof typeof MOUSE_EVENT_TYPES>(
  element: Element | null | undefined,
  type: T,
  options?: MouseEventInit
): void;
export function fireEvent(
  element: Element | null | undefined,
  type: string,
  options?: EventInit
): void;
export function fireEvent(
  element: Element | null | undefined,
  type: string,
  options: EventInit = {}
) {
  if (!element) {
    return;
  }
  let event;
  if ((KEYBOARD_EVENT_TYPES as readonly string[]).indexOf(type) > -1) {
    event = buildKeyboardEvent(type, options);
  } else if ((MOUSE_EVENT_TYPES as readonly string[]).indexOf(type) > -1) {
    let rect = element.getBoundingClientRect();
    let x = rect.left + 1;
    let y = rect.top + 1;
    let simulatedCoordinates = {
      screenX: x + 5,
      screenY: y + 95,
      clientX: x,
      clientY: y,
    };
    event = buildMouseEvent(type, Object.assign(simulatedCoordinates, options));
  } else {
    event = buildBasicEvent(type, options);
  }
  element.dispatchEvent(event);

  return event;
}

function buildBasicEvent(type: string, options: EventInit = {}) {
  return new Event(type, { ...DEFAULT_EVENT_OPTIONS, ...options });
}

function buildMouseEvent(type: string, options: MouseEventInit = {}) {
  let event;
  try {
    event = new MouseEvent(type, { ...DEFAULT_EVENT_OPTIONS, ...options });
  } catch (e) {
    event = buildBasicEvent(type, options);
  }
  return event;
}

function buildKeyboardEvent(type: string, options: KeyboardEventInit = {}) {
  let event;
  try {
    event = new KeyboardEvent(type, { ...DEFAULT_EVENT_OPTIONS, ...options });
  } catch (e) {
    event = buildBasicEvent(type, options);
  }
  return event;
}
