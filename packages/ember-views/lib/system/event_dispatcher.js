/**
@module ember
@submodule ember-views
*/

import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import isNone from 'ember-metal/is_none';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import jQuery from 'ember-views/system/jquery';
import ActionManager from 'ember-views/system/action_manager';
import View from 'ember-views/views/view';
import assign from 'ember-metal/assign';

let ROOT_ELEMENT_CLASS = 'ember-application';
let ROOT_ELEMENT_SELECTOR = '.' + ROOT_ELEMENT_CLASS;

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
    var event;
    var events = assign({}, get(this, 'events'), addedEvents);

    if (!isNone(rootElement)) {
      set(this, 'rootElement', rootElement);
    }

    rootElement = jQuery(get(this, 'rootElement'));

    assert(`You cannot use the same root element (${rootElement.selector || rootElement[0].tagName}) multiple times in an Ember.Application`, !rootElement.is(ROOT_ELEMENT_SELECTOR));
    assert('You cannot make a new Ember.Application using a root element that is a descendent of an existing Ember.Application', !rootElement.closest(ROOT_ELEMENT_SELECTOR).length);
    assert('You cannot make a new Ember.Application using a root element that is an ancestor of an existing Ember.Application', !rootElement.find(ROOT_ELEMENT_SELECTOR).length);

    rootElement.addClass(ROOT_ELEMENT_CLASS);

    assert(`Unable to add '${ROOT_ELEMENT_CLASS}' class to rootElement. Make sure you set rootElement to the body or an element in the body.`, rootElement.is(ROOT_ELEMENT_SELECTOR));

    for (event in events) {
      if (events.hasOwnProperty(event)) {
        this.setupHandler(rootElement, event, events[event]);
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
    @method setupHandler
    @param {Element} rootElement
    @param {String} event the browser-originated event to listen to
    @param {String} eventName the name of the method to call on the view
  */
  setupHandler(rootElement, event, eventName) {
    var self = this;
    var viewRegistry = this.container && this.container.lookup('-view-registry:main') || View.views;

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
    return run.join(view, view.handleEvent, eventName, evt);
  },

  destroy() {
    var rootElement = get(this, 'rootElement');
    jQuery(rootElement).off('.ember', '**').removeClass(ROOT_ELEMENT_CLASS);
    return this._super(...arguments);
  },

  toString() {
    return '(EventDispatcher)';
  }
});
