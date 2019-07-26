import { getOwner } from '@ember/-internals/owner';
import { assign } from '@ember/polyfills';
import { assert } from '@ember/debug';
import { get, set } from '@ember/-internals/metal';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { getElementView } from '@ember/-internals/views';
import jQuery, { jQueryDisabled } from './jquery';
import ActionManager from './action_manager';
import addJQueryEventDeprecation from './jquery_event_deprecation';
import { contains } from './utils';
import { JQUERY_INTEGRATION, MOUSE_ENTER_LEAVE_MOVE_EVENTS } from '@ember/deprecated-features';

/**
@module ember
*/

const ROOT_ELEMENT_CLASS = 'ember-application';
const ROOT_ELEMENT_SELECTOR = `.${ROOT_ELEMENT_CLASS}`;

const EVENT_MAP = {
  mouseenter: 'mouseover',
  mouseleave: 'mouseout',
};

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
    at setup time, generally via the `Application.customEvents` hash.

    To add new events to be listened to:

    ```javascript
    import Application from '@ember/application';

    let App = Application.create({
      customEvents: {
        paste: 'paste'
      }
    });
    ```

    To prevent default events from being listened to:

    ```javascript
    import Application from '@ember/application';

    let App = Application.create({
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
  events: assign(
    {
      touchstart: 'touchStart',
      touchmove: 'touchMove',
      touchend: 'touchEnd',
      touchcancel: 'touchCancel',
      keydown: 'keyDown',
      keyup: 'keyUp',
      keypress: 'keyPress',
      mousedown: 'mouseDown',
      mouseup: 'mouseUp',
      contextmenu: 'contextMenu',
      click: 'click',
      dblclick: 'doubleClick',
      focusin: 'focusIn',
      focusout: 'focusOut',
      submit: 'submit',
      input: 'input',
      change: 'change',
      dragstart: 'dragStart',
      drag: 'drag',
      dragenter: 'dragEnter',
      dragleave: 'dragLeave',
      dragover: 'dragOver',
      drop: 'drop',
      dragend: 'dragEnd',
    },
    MOUSE_ENTER_LEAVE_MOVE_EVENTS
      ? {
          mouseenter: 'mouseEnter',
          mouseleave: 'mouseLeave',
          mousemove: 'mouseMove',
        }
      : {}
  ),

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

  init() {
    this._super();

    assert(
      'EventDispatcher should never be instantiated in fastboot mode. Please report this as an Ember bug.',
      (() => {
        let owner = getOwner(this);
        let environment = owner.lookup('-environment:main');

        return environment.isInteractive;
      })()
    );

    this._eventHandlers = Object.create(null);
  },

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
  setup(addedEvents, _rootElement) {
    let events = (this._finalEvents = assign({}, get(this, 'events'), addedEvents));

    if (_rootElement !== undefined && _rootElement !== null) {
      set(this, 'rootElement', _rootElement);
    }

    let rootElementSelector = get(this, 'rootElement');
    let rootElement;
    if (!JQUERY_INTEGRATION || jQueryDisabled) {
      if (typeof rootElementSelector !== 'string') {
        rootElement = rootElementSelector;
      } else {
        rootElement = document.querySelector(rootElementSelector);
      }

      assert(
        `You cannot use the same root element (${get(this, 'rootElement') ||
          rootElement.tagName}) multiple times in an Ember.Application`,
        !rootElement.classList.contains(ROOT_ELEMENT_CLASS)
      );
      assert(
        'You cannot make a new Ember.Application using a root element that is a descendent of an existing Ember.Application',
        (() => {
          let target = rootElement.parentNode;
          do {
            if (target.classList.contains(ROOT_ELEMENT_CLASS)) {
              return false;
            }

            target = target.parentNode;
          } while (target && target.nodeType === 1);

          return true;
        })()
      );
      assert(
        'You cannot make a new Ember.Application using a root element that is an ancestor of an existing Ember.Application',
        !rootElement.querySelector(ROOT_ELEMENT_SELECTOR)
      );

      rootElement.classList.add(ROOT_ELEMENT_CLASS);

      assert(
        `Unable to add '${ROOT_ELEMENT_CLASS}' class to root element (${get(this, 'rootElement') ||
          rootElement.tagName}). Make sure you set rootElement to the body or an element in the body.`,
        rootElement.classList.contains(ROOT_ELEMENT_CLASS)
      );
    } else {
      rootElement = jQuery(rootElementSelector);
      assert(
        `You cannot use the same root element (${rootElement.selector ||
          rootElement[0].tagName}) multiple times in an Ember.Application`,
        !rootElement.is(ROOT_ELEMENT_SELECTOR)
      );
      assert(
        'You cannot make a new Ember.Application using a root element that is a descendent of an existing Ember.Application',
        !rootElement.closest(ROOT_ELEMENT_SELECTOR).length
      );
      assert(
        'You cannot make a new Ember.Application using a root element that is an ancestor of an existing Ember.Application',
        !rootElement.find(ROOT_ELEMENT_SELECTOR).length
      );

      rootElement.addClass(ROOT_ELEMENT_CLASS);

      if (!rootElement.is(ROOT_ELEMENT_SELECTOR)) {
        throw new TypeError(
          `Unable to add '${ROOT_ELEMENT_CLASS}' class to root element (${rootElement.selector ||
            rootElement[0]
              .tagName}). Make sure you set rootElement to the body or an element in the body.`
        );
      }
    }

    for (let event in events) {
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
    if (eventName === null) {
      return;
    }

    if (!JQUERY_INTEGRATION || jQueryDisabled) {
      let viewHandler = (target, event) => {
        let view = getElementView(target);
        let result = true;

        if (view) {
          result = view.handleEvent(eventName, event);
        }

        return result;
      };

      let actionHandler = (target, event) => {
        let actionId = target.getAttribute('data-ember-action');
        let actions = ActionManager.registeredActions[actionId];

        // In Glimmer2 this attribute is set to an empty string and an additional
        // attribute it set for each action on a given element. In this case, the
        // attributes need to be read so that a proper set of action handlers can
        // be coalesced.
        if (actionId === '') {
          let attributes = target.attributes;
          let attributeCount = attributes.length;

          actions = [];

          for (let i = 0; i < attributeCount; i++) {
            let attr = attributes.item(i);
            let attrName = attr.name;

            if (attrName.indexOf('data-ember-action-') === 0) {
              actions = actions.concat(ActionManager.registeredActions[attr.value]);
            }
          }
        }

        // We have to check for actions here since in some cases, jQuery will trigger
        // an event on `removeChild` (i.e. focusout) after we've already torn down the
        // action handlers for the view.
        if (!actions) {
          return;
        }

        let result = true;
        for (let index = 0; index < actions.length; index++) {
          let action = actions[index];

          if (action && action.eventName === eventName) {
            // return false if any of the action handlers returns false
            result = action.handler(event) && result;
          }
        }
        return result;
      };

      // Special handling of events that don't bubble (event delegation does not work).
      // Mimics the way this is handled in jQuery,
      // see https://github.com/jquery/jquery/blob/899c56f6ada26821e8af12d9f35fa039100e838e/src/event.js#L666-L700
      if (MOUSE_ENTER_LEAVE_MOVE_EVENTS && EVENT_MAP[event] !== undefined) {
        let mappedEventType = EVENT_MAP[event];
        let origEventType = event;

        let createFakeEvent = (eventType, event) => {
          let fakeEvent = document.createEvent('MouseEvent');
          fakeEvent.initMouseEvent(
            eventType,
            false,
            false,
            event.view,
            event.detail,
            event.screenX,
            event.screenY,
            event.clientX,
            event.clientY,
            event.ctrlKey,
            event.altKey,
            event.shiftKey,
            event.metaKey,
            event.button,
            event.relatedTarget
          );

          // fake event.target as we don't dispatch the event
          Object.defineProperty(fakeEvent, 'target', { value: event.target, enumerable: true });

          return fakeEvent;
        };

        let handleMappedEvent = (this._eventHandlers[mappedEventType] = event => {
          let target = event.target;
          let related = event.relatedTarget;

          while (
            target &&
            target.nodeType === 1 &&
            (related === null || (related !== target && !contains(target, related)))
          ) {
            // mouseEnter/Leave don't bubble, so there is no logic to prevent it as with other events
            if (getElementView(target)) {
              viewHandler(target, createFakeEvent(origEventType, event));
            } else if (target.hasAttribute('data-ember-action')) {
              actionHandler(target, createFakeEvent(origEventType, event));
            }

            // separate mouseEnter/Leave events are dispatched for each listening element
            // until the element (related) has been reached that the pointing device exited from/to
            target = target.parentNode;
          }
        });

        rootElement.addEventListener(mappedEventType, handleMappedEvent);
      } else {
        let handleEvent = (this._eventHandlers[event] = event => {
          let target = event.target;

          do {
            if (getElementView(target)) {
              if (viewHandler(target, event) === false) {
                event.preventDefault();
                event.stopPropagation();
                break;
              } else if (event.cancelBubble === true) {
                break;
              }
            } else if (
              typeof target.hasAttribute === 'function' &&
              target.hasAttribute('data-ember-action')
            ) {
              if (actionHandler(target, event) === false) {
                break;
              }
            }

            target = target.parentNode;
          } while (target && target.nodeType === 1);
        });

        rootElement.addEventListener(event, handleEvent);
      }
    } else {
      rootElement.on(`${event}.ember`, '.ember-view', function(evt) {
        let view = getElementView(this);
        let result = true;

        if (view) {
          result = view.handleEvent(eventName, addJQueryEventDeprecation(evt));
        }

        return result;
      });

      rootElement.on(`${event}.ember`, '[data-ember-action]', evt => {
        let attributes = evt.currentTarget.attributes;
        let handledActions = [];

        evt = addJQueryEventDeprecation(evt);

        for (let i = 0; i < attributes.length; i++) {
          let attr = attributes.item(i);
          let attrName = attr.name;

          if (attrName.lastIndexOf('data-ember-action-', 0) !== -1) {
            let action = ActionManager.registeredActions[attr.value];

            // We have to check for action here since in some cases, jQuery will trigger
            // an event on `removeChild` (i.e. focusout) after we've already torn down the
            // action handlers for the view.
            if (action && action.eventName === eventName && handledActions.indexOf(action) === -1) {
              action.handler(evt);
              // Action handlers can mutate state which in turn creates new attributes on the element.
              // This effect could cause the `data-ember-action` attribute to shift down and be invoked twice.
              // To avoid this, we keep track of which actions have been handled.
              handledActions.push(action);
            }
          }
        }
      });
    }
  },

  destroy() {
    let rootElementSelector = get(this, 'rootElement');
    let rootElement;
    if (rootElementSelector.nodeType) {
      rootElement = rootElementSelector;
    } else {
      rootElement = document.querySelector(rootElementSelector);
    }

    if (!rootElement) {
      return;
    }

    if (!JQUERY_INTEGRATION || jQueryDisabled) {
      for (let event in this._eventHandlers) {
        rootElement.removeEventListener(event, this._eventHandlers[event]);
      }
    } else {
      jQuery(rootElementSelector).off('.ember', '**');
    }

    rootElement.classList.remove(ROOT_ELEMENT_CLASS);

    return this._super(...arguments);
  },

  toString() {
    return '(EventDispatcher)';
  },
});
