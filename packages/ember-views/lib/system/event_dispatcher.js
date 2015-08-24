/**
@module ember
@submodule ember-views
*/
import Ember from 'ember-metal/core'; // Ember.assert

import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import isNone from 'ember-metal/is_none';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import jQuery from 'ember-views/system/jquery';
import ActionManager from 'ember-views/system/action_manager';
import View from 'ember-views/views/view';
import assign from 'ember-metal/assign';

/**
 Whether or not to cache handler paths on the element
 when `useCapture` is also true.

 This needs to be replaced by a feature flag.

 @private
 @type {boolean}
*/
const useFastPaths = true;

/**
  `Ember.EventDispatcher` handles delegating browser events to their
  corresponding `Ember.Views.` For example, when you click on a view,
  `Ember.EventDispatcher` ensures that that view's `mouseDown` method gets
  called.

  @class EventDispatcher
  @namespace Ember
  @private
  @extends Ember.Object
*/
export default EmberObject.extend({

  /**
    The set of events names (and associated handler function names) to be setup
    and dispatched by the `EventDispatcher`. Modifications to this list can be done
    at setup time, generally via the `Ember.Application.customEvents` hash.

    To add new events to be listened to:

    ```javascript
    var App = Ember.Application.create({
      customEvents: {
        paste: 'paste'
      }
    });
    ```

    To prevent default events from being listened to:

    ```javascript
    var App = Ember.Application.create({
      customEvents: {
        mouseenter: null,
        mouseleave: null
      }
    });
    ```
    @property events
    @type Object
    @private
  */
  events: {
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
  },

  /**
    The root DOM element to which event listeners should be attached. Event
    listeners will be attached to the document unless this is overridden.

    Can be specified as a DOMElement or a selector string.

    The default body is a string since this may be evaluated before document.body
    exists in the DOM.

    @private
    @property rootElement
    @type DOMElement
    @default 'body'
  */
  rootElement: 'body',

  /**
    It enables events to be dispatched to the view's `eventManager.` When present,
    this object takes precedence over handling of events on the view itself.

    Note that most Ember applications do not use this feature. If your app also
    does not use it, consider setting this property to false to gain some performance
    improvement by allowing the EventDispatcher to skip the search for the
    `eventManager` on the view tree.

    ```javascript
    var EventDispatcher = Em.EventDispatcher.extend({
      events: {
          click       : 'click',
          focusin     : 'focusIn',
          focusout    : 'focusOut',
          change      : 'change'
      },
      canDispatchToEventManager: false
    });
    container.register('event_dispatcher:main', EventDispatcher);
    ```

    @property canDispatchToEventManager
    @type boolean
    @default 'true'
    @since 1.7.0
    @private
  */
  canDispatchToEventManager: true,

  /**
   Enables capturing of events immediately instead of during bubble
   @private
  */
  useCapture: true,


  /**
    Sets up event listeners for standard browser events.

    This will be called after the browser sends a `DOMContentReady` event. By
    default, it will set up all of the listeners on the document body. If you
    would like to register the listeners on a different element, set the event
    dispatcher's `root` property.

    @private
    @method setup
    @param addedEvents {Object}
  */
  setup(addedEvents, rootElement) {
    let event;
    let events = assign({}, get(this, 'events'), addedEvents);
    let viewRegistry = this.container && this.container.lookup('-view-registry:main') || View.views;
    let eventWalker;

    if (!isNone(rootElement)) {
      set(this, 'rootElement', rootElement);
    }

    rootElement = jQuery(get(this, 'rootElement'));

    Ember.assert(`You cannot use the same root element (${rootElement.selector || rootElement[0].tagName}) multiple times in an Ember.Application`, !rootElement.is('.ember-application'));
    Ember.assert('You cannot make a new Ember.Application using a root element that is a descendent of an existing Ember.Application', !rootElement.closest('.ember-application').length);
    Ember.assert('You cannot make a new Ember.Application using a root element that is an ancestor of an existing Ember.Application', !rootElement.find('.ember-application').length);

    rootElement.addClass('ember-application');

    Ember.assert('Unable to add "ember-application" class to rootElement. Make sure you set rootElement to the body or an element in the body.', rootElement.is('.ember-application'));

    if (get(this, 'useCapture')) {
      rootElement = rootElement.get(0);
      eventWalker = new EventWalker(viewRegistry);
      for (event in events) {
        if (events.hasOwnProperty(event)) {
          this.setupCaptureHandler(viewRegistry, rootElement, event, events[event], eventWalker);
        }
      }
    } else {
      for (event in events) {
        if (events.hasOwnProperty(event)) {
          this.setupBubbleHandler(viewRegistry, rootElement, event, events[event]);
        }
      }
    }
  },

  /**
    Registers an event listener on the rootElement. If the given event is
    triggered, the provided event handler will be triggered on the target view.

    If the target view does not implement the event handler, or if the handler
    returns `false`, the parent view will be called. The event will continue to
    bubble to each successive parent view until it reaches the top.

    @private
    @method setupBubbleHandler
    @param viewRegistry registry for ember views
    @param {Element} rootElement
    @param {String} event the browser-originated event to listen to
    @param {String} eventName the name of the method to call on the view
  */
  setupBubbleHandler(viewRegistry, rootElement, event, eventName) {
    var self = this;

    if (eventName === null) {
      return;
    }

    rootElement.on(event + '.ember', '.ember-view', function(evt, triggeringManager) {
      var view = viewRegistry[this.id];
      var result = true;

      var manager = self.canDispatchToEventManager ? self._findNearestEventManager(view, eventName) : null;

      if (manager && manager !== triggeringManager) {
        result = self._dispatchEvent(manager, evt, eventName, view);
      } else if (view) {
        result = self._bubbleEvent(view, evt, eventName);
      }

      return result;
    });

    rootElement.on(event + '.ember', '[data-ember-action]', function(evt) {
      var actionId = jQuery(evt.currentTarget).attr('data-ember-action');
      var actions   = ActionManager.registeredActions[actionId];

      // We have to check for actions here since in some cases, jQuery will trigger
      // an event on `removeChild` (i.e. focusout) after we've already torn down the
      // action handlers for the view.
      if (!actions) {
        return;
      }

      for (let index = 0, length = actions.length; index < length; index++) {
        let action = actions[index];

        if (action && action.eventName === eventName) {
          return action.handler(evt);
        }
      }
    });
  },

  /**
    Cache for event listeners attached with `useCapture`

    @private
  */
  _handlers: [],
  /**
    Registers an event listener on the rootElement. If the given event is
    triggered, the provided event handler will be triggered on the target view.

    If the target view does not implement the event handler, or if the handler
    returns `false`, the parent view will be called. The event will continue to
    bubble to each successive parent view until it reaches the top.

    @private
    @method setupCaptureHandler
    @param viewRegistry registry for ember views
    @param {Element} rootElement
    @param {String} event the browser-originated event to listen to
    @param {String} eventName the name of the method to call on the view
    @param eventWalker an instance of a walker used to find the closest action or view element
  */
  setupCaptureHandler(viewRegistry, rootElement, event, eventName, eventWalker) {
    let self = this;

    function didFindId(evt, triggeringManager, handlers) {
      let view = viewRegistry[this.id];
      let result = true;

      var manager = self.canDispatchToEventManager ? self._findNearestEventManager(view, eventName) : null;

      // collect handler
      if (useFastPaths && handlers) {
        // TODO this logic needs pulled out of _dispatchEvent and _bubbleEvent
        // TODO and we should collect the actual handler, not just the element
        if (manager[eventName] && typeof manager[eventName] === 'function') {
          handlers.push(['id', this]);
        } else if (view.has(eventName)) {
          handlers.push(['id', this]);
        }
      }

      if (manager && manager !== triggeringManager) {
        result = self._dispatchEvent(manager, evt, eventName, view);
      } else if (view) {
        result = self._bubbleEvent(view, evt, eventName);
      }

      return result;
    }

    function didFindAction(evt, handlers) {
      var actionId = this.getAttribute('data-ember-action');
      var actions   = ActionManager.registeredActions[actionId];

      // We have to check for actions here since in some cases, jQuery will trigger
      // an event on `removeChild` (i.e. focusout) after we've already torn down the
      // action handlers for the view.
      if (!actions) {
        return;
      }

      for (let index = 0, length = actions.length; index < length; index++) {
        let action = actions[index];

        if (action && action.eventName === eventName) {
          // collect handler
          // TODO this should collect the actual handler instead
          if (useFastPaths && handlers) {
            handlers.push(['action', this]);
          }

          return action.handler(evt);
        }
      }
    }

    let filterFn = filterCaptureFunction(didFindId, didFindAction, eventWalker);
    this._handlers.push({ event: event, method: filterFn });
    rootElement.addEventListener(event, filterFn, true);
  },

  _findNearestEventManager(view, eventName) {
    var manager = null;

    while (view) {
      manager = get(view, 'eventManager');
      if (manager && manager[eventName]) { break; }

      view = get(view, 'parentView');
    }

    return manager;
  },

  _dispatchEvent(object, evt, eventName, view) {
    var result = true;

    var handler = object[eventName];
    if (typeof handler === 'function') {
      result = run(object, handler, evt, view);
      // Do not preventDefault in eventManagers.
      evt.stopPropagation();
    } else {
      result = this._bubbleEvent(view, evt, eventName);
    }

    return result;
  },

  _bubbleEvent(view, evt, eventName) {
    return view.handleEvent(eventName, evt);
  },

  destroy() {
    var rootElement = get(this, 'rootElement');
    if (get(this, 'useCapture')) {
      this._handlers.forEach(function(item) {
        rootElement.removeEventListener(item.event, item.method, true);
      });
      this._handlers = [];
      jQuery(rootElement).removeClass('ember-application');
    } else {
      jQuery(rootElement).off('.ember', '**').removeClass('ember-application');
    }
    return this._super(...arguments);
  },

  toString() {
    return '(EventDispatcher)';
  }
});



function filterCaptureFunction(eventName, idHandler, actionHandler, walker) {
  return function(e) {
    // normalize the event object
    // this also let's us set currentTarget correctly
    let event = jQuery.event.fix(e);

    let element = event.target;
    let result;
    let handlers;

    // trigger from cached handlers
    if (useFastPaths && element._handlers && element._handlers[eventName]) {
      element._handlers[eventName].forEach((handler) => {
        event.currentTarget = handler[1];
        if (handler[0] === 'id') {
          result = idHandler.call(handler[1], event);
        } else {
          result = actionHandler.call(handler[1], event);
        }
      });
      return result;

    // collect and trigger handlers
    } else {
      if (useFastPaths) {
        element._handlers = element._handlers || {};
        handlers = element._handlers[eventName] = element._handlers[eventName] || [];
      }

      let node;
      do {
        node = walker.closest(element);
        if (node) {
          event.currentTarget = node[1];
          if (node[0] === 'id') {
            result = idHandler.call(node[1], event, null, handlers);
          } else {
            result = actionHandler.call(node[1], event, handlers);
          }
          if (result) {
            node = node.parentNode;
          }
        }
      } while (result && node);
      return result;
    }
  };
}


function EventWalker(registry) {
  this.registry = registry;
}

EventWalker.prototype.inRegistry = function EventWalker_inRegistry(id) {
  return !!this.registry[id];
};

EventWalker.prototype.closest = function EventWalker_closest(closest) {
  do {
    if (closest.id && this.inRegistry(closest.id)) {
      return ['id', closest];
    }
    if (closest.hasAttribute('data-ember-action')) {
      return ['action', closest];
    }
  } while (closest = closest.parentNode);
  return null;
};
