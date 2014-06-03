import { addEventListener, removeEventListener } from "ember-metal-views/dom";

// Hash lookup by view ID for event delegation
var views = {},
    _views = views,
    guid = 0;

function findContainingView(el) {
  var view;
  while (el && !(view = views[el.id])) { // TODO: use a class and querySelector instead?
    el = el.parentElement;
  }
  return view;
}

function tryToDispatchEvent(view, type, event) {
  try {
    view[type](event);
  } catch(e) {

  }
}

function eventHandler(event) {
  var view = findContainingView(event.target);
  if (view) { tryToDispatchEvent(view, events[event.type], event); }
}

var events = {
  touchstart  : 'touchStart',
  touchmove   : 'touchMove',
  touchend    : 'touchEnd',
  touchcancel : 'touchCancel',
  keydown     : 'keyDown',
  keyup       : 'keyUp',
  keypress    : 'keyPress',
  mousedown   : 'mouseDown',
  mouseup     : 'mouseUp',
  contextmenu : 'contextMenu',
  click       : 'click',
  dblclick    : 'doubleClick',
  mousemove   : 'mouseMove',
  focusin     : 'focusIn',
  focusout    : 'focusOut',
  mouseenter  : 'mouseEnter',
  mouseleave  : 'mouseLeave',
  submit      : 'submit',
  input       : 'input',
  change      : 'change',
  dragstart   : 'dragStart',
  drag        : 'drag',
  dragenter   : 'dragEnter',
  dragleave   : 'dragLeave',
  dragover    : 'dragOver',
  drop        : 'drop',
  dragend     : 'dragEnd'
};

var eventNames = Object.keys(events);

var eventDispatcherActive = false;

function setupEventDispatcher() {
  if (!eventDispatcherActive) {
    for (var i = 0, l = eventNames.length; i < l; i++) {
      addEventListener(document, eventNames[i], eventHandler, false);
    }
    eventDispatcherActive = true;
  }
}

function reset() {
  guid = 0;
  // views = {}; // FIXME: setting Ember.View.views is a hack
  // FIXME: hack to keep object reference the same
  for (var key in views) {
    delete views[key];
  }
  eventDispatcherActive = false;
  for (var i = 0, l = eventNames.length; i < l; i++) {
    removeEventListener(document, eventNames[i], eventHandler);
  }
}

function lookupView(id) {
  return views[id];
}

function setupView(view) {
  var elementId = view.elementId = view.elementId || guid++; // FIXME: guid should be prefixed
  views[elementId] = view;
}

function teardownView(view) {
  delete views[view.elementId];
}

export { lookupView, setupView, teardownView, events, setupEventDispatcher, reset, _views };
