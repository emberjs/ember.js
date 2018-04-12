import { run } from '@ember/runloop';
/* globals Element */

import { merge } from 'ember-metal';

const DEFAULT_EVENT_OPTIONS = { canBubble: true, cancelable: true };
const KEYBOARD_EVENT_TYPES = ['keydown', 'keypress', 'keyup'];
const MOUSE_EVENT_TYPES = [
  'click',
  'mousedown',
  'mouseup',
  'dblclick',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
];

export const elMatches =
  typeof Element !== 'undefined' &&
  (Element.prototype.matches ||
    Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector);

export function matches(el, selector) {
  return elMatches.call(el, selector);
}

function isFocusable(el) {
  let focusableTags = ['INPUT', 'BUTTON', 'LINK', 'SELECT', 'A', 'TEXTAREA'];
  let { tagName, type } = el;

  if (type === 'hidden') {
    return false;
  }

  return focusableTags.indexOf(tagName) > -1 || el.contentEditable === 'true';
}

export function click(el, options = {}) {
  run(() => fireEvent(el, 'mousedown', options));
  focus(el);
  run(() => fireEvent(el, 'mouseup', options));
  run(() => fireEvent(el, 'click', options));
}

export function focus(el) {
  if (!el) {
    return;
  }
  if (isFocusable(el)) {
    run(null, function() {
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

export function blur(el) {
  if (isFocusable(el)) {
    run(null, function() {
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

export function fireEvent(element, type, options = {}) {
  if (!element) {
    return;
  }
  let event;
  if (KEYBOARD_EVENT_TYPES.indexOf(type) > -1) {
    event = buildKeyboardEvent(type, options);
  } else if (MOUSE_EVENT_TYPES.indexOf(type) > -1) {
    let rect = element.getBoundingClientRect();
    let x = rect.left + 1;
    let y = rect.top + 1;
    let simulatedCoordinates = {
      screenX: x + 5,
      screenY: y + 95,
      clientX: x,
      clientY: y,
    };
    event = buildMouseEvent(type, merge(simulatedCoordinates, options));
  } else {
    event = buildBasicEvent(type, options);
  }
  element.dispatchEvent(event);

  return event;
}

function buildBasicEvent(type, options = {}) {
  let event = document.createEvent('Events');
  event.initEvent(type, true, true);
  merge(event, options);
  return event;
}

function buildMouseEvent(type, options = {}) {
  let event;
  try {
    event = document.createEvent('MouseEvents');
    let eventOpts = merge({}, DEFAULT_EVENT_OPTIONS);
    merge(eventOpts, options);

    event.initMouseEvent(
      type,
      eventOpts.canBubble,
      eventOpts.cancelable,
      window,
      eventOpts.detail,
      eventOpts.screenX,
      eventOpts.screenY,
      eventOpts.clientX,
      eventOpts.clientY,
      eventOpts.ctrlKey,
      eventOpts.altKey,
      eventOpts.shiftKey,
      eventOpts.metaKey,
      eventOpts.button,
      eventOpts.relatedTarget
    );
  } catch (e) {
    event = buildBasicEvent(type, options);
  }
  return event;
}

function buildKeyboardEvent(type, options = {}) {
  let event;
  try {
    event = document.createEvent('KeyEvents');
    let eventOpts = merge({}, DEFAULT_EVENT_OPTIONS);
    merge(eventOpts, options);
    event.initKeyEvent(
      type,
      eventOpts.canBubble,
      eventOpts.cancelable,
      window,
      eventOpts.ctrlKey,
      eventOpts.altKey,
      eventOpts.shiftKey,
      eventOpts.metaKey,
      eventOpts.keyCode,
      eventOpts.charCode
    );
  } catch (e) {
    event = buildBasicEvent(type, options);
  }
  return event;
}
