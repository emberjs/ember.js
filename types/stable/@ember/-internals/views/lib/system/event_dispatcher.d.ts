declare module '@ember/-internals/views/lib/system/event_dispatcher' {
  import EmberObject from '@ember/object';
  /**
      `Ember.EventDispatcher` handles delegating browser events to their
      corresponding `Ember.Views.` For example, when you click on a view,
      `Ember.EventDispatcher` ensures that that view's `mouseDown` method gets
      called.

      @class EventDispatcher
      @namespace Ember
      @private
      @extends EmberObject
    */
  export default class EventDispatcher extends EmberObject {
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
    events: Record<string, string>;
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
    rootElement: string | Element;
    _eventHandlers: any;
    _didSetup: boolean;
    finalEventNameMapping: Record<string, string> | null;
    _sanitizedRootElement: Element | null;
    lazyEvents: Map<string, string | null>;
    _reverseEventNameMapping: Record<string, string> | null;
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
    setup(addedEvents: Record<string, string | null>, _rootElement: string | Element | null): void;
    /**
          Setup event listeners for the given browser event name
      
          @private
          @method setupHandlerForBrowserEvent
          @param event the name of the event in the browser
        */
    setupHandlerForBrowserEvent(event: string): void;
    /**
          Setup event listeners for the given Ember event name (camel case)
      
          @private
          @method setupHandlerForEmberEvent
          @param eventName
        */
    setupHandlerForEmberEvent(eventName: string): void;
    /**
          Registers an event listener on the rootElement. If the given event is
          triggered, the provided event handler will be triggered on the target view.
      
          If the target view does not implement the event handler, or if the handler
          returns `false`, the parent view will be called. The event will continue to
          bubble to each successive parent view until it reaches the top.
      
          @private
          @method setupHandler
          @param {Element} rootElement
          @param {String} event the name of the event in the browser
          @param {String} eventName the name of the method to call on the view
        */
    setupHandler(rootElement: Element, event: string, eventName: string | null): void;
    destroy(): any;
    toString(): string;
  }
}
