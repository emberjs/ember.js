import { run } from '@ember/runloop';
import { assign } from 'ember-utils';
import isFormControl from './helpers/-is-form-control';

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

export function focus(el) {
  if (!el) {
    return;
  }
  if (el.isContentEditable || isFormControl(el)) {
    let type = el.getAttribute('type');
    if (type !== 'checkbox' && type !== 'radio' && type !== 'hidden') {
      run(null, function() {
        let browserIsNotFocused = document.hasFocus && !document.hasFocus();

        // makes `document.activeElement` be `element`. If the browser is focused, it also fires a focus event
        el.focus();

        // Firefox does not trigger the `focusin` event if the window
        // does not have focus. If the document does not have focus then
        // fire `focusin` event as well.
        if (browserIsNotFocused) {
          // if the browser is not focused the previous `el.focus()` didn't fire an event, so we simulate it
          fireEvent(el, 'focus', {
            bubbles: false,
          });

          fireEvent(el, 'focusin');
        }
      });
    }
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
    event = buildMouseEvent(type, assign(simulatedCoordinates, options));
  } else {
    event = buildBasicEvent(type, options);
  }
  element.dispatchEvent(event);
}

function buildBasicEvent(type, options = {}) {
  let event = document.createEvent('Events');

  // Event.bubbles is read only
  let bubbles = options.bubbles !== undefined ? options.bubbles : true;
  let cancelable = options.cancelable !== undefined ? options.cancelable : true;

  delete options.bubbles;
  delete options.cancelable;

  event.initEvent(type, bubbles, cancelable);
  assign(event, options);
  return event;
}

function buildMouseEvent(type, options = {}) {
  let event;
  try {
    event = document.createEvent('MouseEvents');
    let eventOpts = assign({}, DEFAULT_EVENT_OPTIONS, options);
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
    let eventOpts = assign({}, DEFAULT_EVENT_OPTIONS, options);
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
