import { jQuery } from 'ember-views';
import { run } from 'ember-metal';

const DEFAULT_EVENT_OPTIONS = { canBubble: true, cancelable: true };
const KEYBOARD_EVENT_TYPES = ['keydown', 'keypress', 'keyup'];
const MOUSE_EVENT_TYPES = ['click', 'mousedown', 'mouseup', 'dblclick', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover'];

export function focus(el) {
  if (!el) { return; }
  let $el = jQuery(el);
  if ($el.is(':input, [contenteditable=true]')) {
    let type = $el.prop('type');
    if (type !== 'checkbox' && type !== 'radio' && type !== 'hidden') {
      run(null, function() {
        // Firefox does not trigger the `focusin` event if the window
        // does not have focus. If the document doesn't have focus just
        // use trigger('focusin') instead.

        if (!document.hasFocus || document.hasFocus()) {
          el.focus();
        } else {
          $el.trigger('focusin');
        }
      });
    }
  }
}

function isNullOrUndefined(obj) {
  return obj === undefined || obj === null;
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
      screenX: isNullOrUndefined(options.screenX) ? x + 5 : options.screenX,
      screenY: isNullOrUndefined(options.screenY) ? y + 95 : options.screenY,
      clientX: isNullOrUndefined(options.clientX) ? x : options.clientX,
      clientY: isNullOrUndefined(options.clientY) ? y : options.clientY
    };
    if (!options.button) {
      // default to left button
      options.button = 0;
    }
    options.which = options.button + 1; // jquery normalises to 1,2,3 for left, middle, right
    event = buildMouseEvent(type, jQuery.extend(simulatedCoordinates, options));
  } else {
    event = buildBasicEvent(type, options);
  }
  element.dispatchEvent(event);
}

function buildBasicEvent(type, options = {}) {
  let event = document.createEvent('Events');
  event.initEvent(type, true, true);
  jQuery.extend(event, options);
  return event;
}

function buildMouseEvent(type, options = {}) {
  let event;
  try {
    event = document.createEvent('MouseEvents');
    let eventOpts = jQuery.extend({}, DEFAULT_EVENT_OPTIONS, options);
    //todo: initMouseEvent has been deprecated https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/initMouseEvent
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
      eventOpts.relatedTarget);
  } catch (e) {
    event = buildBasicEvent(type, options);
  }
  return event;
}

function buildKeyboardEvent(type, options = {}) {
  let event;
  try {
    event = document.createEvent('KeyEvents');
    let eventOpts = jQuery.extend({}, DEFAULT_EVENT_OPTIONS, options);
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
