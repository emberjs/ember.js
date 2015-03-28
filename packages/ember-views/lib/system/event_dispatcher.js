/**
@module ember
@submodule ember-views
*/
import Ember from "ember-metal/core"; // Ember.assert

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import isNone from 'ember-metal/is_none';
import run from "ember-metal/run_loop";
import { typeOf } from "ember-metal/utils";
import { fmt } from "ember-runtime/system/string";
import EmberObject from "ember-runtime/system/object";
import jQuery from "ember-views/system/jquery";
import ActionManager from "ember-views/system/action_manager";
import View from "ember-views/views/view";
import merge from "ember-metal/merge";

//ES6TODO:
// find a better way to do Ember.View.views without global state

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
    and dispatched by the `EventDispatcher`. Custom events can added to this list at setup
    time, generally via the `Ember.Application.customEvents` hash. Only override this
    default set to prevent the EventDispatcher from listening on some events all together.

    This set will be modified by `setup` to also include any events added at that time.

    @property events
    @type Object
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
    @param addedEvents {Hash}
  */
  setup(addedEvents, rootElement) {
    var event;
    var events = get(this, 'events');

    merge(events, addedEvents || {});

    if (!isNone(rootElement)) {
      set(this, 'rootElement', rootElement);
    }

    rootElement = jQuery(get(this, 'rootElement'));

    Ember.assert(fmt('You cannot use the same root element (%@) multiple times in an Ember.Application', [rootElement.selector || rootElement[0].tagName]), !rootElement.is('.ember-application'));
    Ember.assert('You cannot make a new Ember.Application using a root element that is a descendent of an existing Ember.Application', !rootElement.closest('.ember-application').length);
    Ember.assert('You cannot make a new Ember.Application using a root element that is an ancestor of an existing Ember.Application', !rootElement.find('.ember-application').length);

    rootElement.addClass('ember-application');

    Ember.assert('Unable to add "ember-application" class to rootElement. Make sure you set rootElement to the body or an element in the body.', rootElement.is('.ember-application'));

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

    rootElement.on(event + '.ember', '.ember-view', function(evt, triggeringManager) {
      var view = View.views[this.id];
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
      var action   = ActionManager.registeredActions[actionId];

      // We have to check for action here since in some cases, jQuery will trigger
      // an event on `removeChild` (i.e. focusout) after we've already torn down the
      // action handlers for the view.
      if (action && action.eventName === eventName) {
        return action.handler(evt);
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
    if (typeOf(handler) === 'function') {
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
    jQuery(rootElement).off('.ember', '**').removeClass('ember-application');
    return this._super(...arguments);
  },

  toString() {
    return '(EventDispatcher)';
  }
});
