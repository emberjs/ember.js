import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Opaque, Simple } from '@glimmer/interfaces';
import { Tag } from '@glimmer/reference';
import { Arguments, CapturedArguments, ModifierManager } from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util';
import buildUntouchableThis from '../utils/untouchable-this';

const untouchableContext = buildUntouchableThis('`on` modifier');

/*
  Internet Explorer 11 does not support `once` and also does not support
  passing `eventOptions`. In some situations it then throws a weird script
  error, like:

  ```
  Could not complete the operation due to error 80020101
  ```

  This flag determines, whether `{ once: true }` and thus also event options in
  general are supported.
*/
const SUPPORTS_EVENT_OPTIONS = (() => {
  try {
    const div = document.createElement('div');
    let counter = 0;
    div.addEventListener('click', () => counter++, { once: true });

    let event;
    if (typeof Event === 'function') {
      event = new Event('click');
    } else {
      event = document.createEvent('Event');
      event.initEvent('click', true, true);
    }

    div.dispatchEvent(event);
    div.dispatchEvent(event);

    return counter === 1;
  } catch (error) {
    return false;
  }
})();

export class OnModifierState {
  public tag: Tag;
  public element: Element;
  public args: CapturedArguments;
  public eventName!: string;
  public callback!: EventListener;
  private userProvidedCallback!: EventListener;
  public once?: boolean;
  public passive?: boolean;
  public capture?: boolean;
  public options?: AddEventListenerOptions;
  public shouldUpdate = true;

  constructor(element: Element, args: CapturedArguments) {
    this.element = element;
    this.args = args;
    this.tag = args.tag;
  }

  updateFromArgs() {
    let { args } = this;

    let { once, passive, capture }: AddEventListenerOptions = args.named.value();
    if (once !== this.once) {
      this.once = once;
      this.shouldUpdate = true;
    }

    if (passive !== this.passive) {
      this.passive = passive;
      this.shouldUpdate = true;
    }

    if (capture !== this.capture) {
      this.capture = capture;
      this.shouldUpdate = true;
    }

    let options: AddEventListenerOptions;
    if (once || passive || capture) {
      options = this.options = { once, passive, capture };
    } else {
      this.options = undefined;
    }

    assert(
      'You must pass a valid DOM event name as the first argument to the `on` modifier',
      args.positional.at(0) !== undefined && typeof args.positional.at(0).value() === 'string'
    );
    let eventName = args.positional.at(0).value() as string;
    if (eventName !== this.eventName) {
      this.eventName = eventName;
      this.shouldUpdate = true;
    }

    assert(
      'You must pass a function as the second argument to the `on` modifier',
      args.positional.at(1) !== undefined && typeof args.positional.at(1).value() === 'function'
    );
    let userProvidedCallback = args.positional.at(1).value() as EventListener;
    if (userProvidedCallback !== this.userProvidedCallback) {
      this.userProvidedCallback = userProvidedCallback;
      this.shouldUpdate = true;
    }

    assert(
      `You can only pass two positional arguments (event name and callback) to the \`on\` modifier, but you provided ${
        args.positional.length
      }. Consider using the \`fn\` helper to provide additional arguments to the \`on\` callback.`,
      args.positional.length === 2
    );

    let needsCustomCallback =
        (SUPPORTS_EVENT_OPTIONS === false && once) /* needs manual once implementation */ ||
        (DEBUG && passive) /* needs passive enforcement */;

    if (this.shouldUpdate) {
      if (needsCustomCallback) {
        let callback = (this.callback = function(this: Element, event) {
          if (DEBUG && passive) {
            event.preventDefault = () => {
              assert(
                `You marked this listener as 'passive', meaning that you must not call 'event.preventDefault()': \n\n${userProvidedCallback}`
              );
            };
          }

          if (!SUPPORTS_EVENT_OPTIONS && once) {
            removeEventListener(this, eventName, callback, options);
          }
          return userProvidedCallback.call(untouchableContext, event);
        });
      } else if (DEBUG) {
        // prevent the callback from being bound to the element
        this.callback = userProvidedCallback.bind(untouchableContext);
      } else {
        this.callback = userProvidedCallback;
      }
    }
  }

  destroy() {
    let { element, eventName, callback, options } = this;

    removeEventListener(element, eventName, callback, options);
  }
}

let adds = 0;
let removes = 0;

function removeEventListener(
  element: Element,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): void {
  removes++;

  if (SUPPORTS_EVENT_OPTIONS) {
    // when options are supported, use them across the board
    element.removeEventListener(eventName, callback, options);
  } else if (options !== undefined && options.capture) {
    // used only in the following case:
    //
    // `{ once: true | false, passive: true | false, capture: true }
    //
    // `once` is handled via a custom callback that removes after first
    // invocation so we only care about capture here as a boolean
    element.removeEventListener(eventName, callback, true);
  } else {
    // used only in the following cases:
    //
    // * where there is no options
    // * `{ once: true | false, passive: true | false, capture: false }
    element.removeEventListener(eventName, callback);
  }
}

function addEventListener(
  element: Element,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): void {
  adds++;

  if (SUPPORTS_EVENT_OPTIONS) {
    // when options are supported, use them across the board
    element.addEventListener(eventName, callback, options);
  } else if (options !== undefined && options.capture) {
    // used only in the following case:
    //
    // `{ once: true | false, passive: true | false, capture: true }
    //
    // `once` is handled via a custom callback that removes after first
    // invocation so we only care about capture here as a boolean
    element.addEventListener(eventName, callback, true);
  } else {
    // used only in the following cases:
    //
    // * where there is no options
    // * `{ once: true | false, passive: true | false, capture: false }
    element.addEventListener(eventName, callback);
  }
}

export default class OnModifierManager implements ModifierManager<OnModifierState, Opaque> {
  public SUPPORTS_EVENT_OPTIONS: boolean = SUPPORTS_EVENT_OPTIONS;

  get counters() {
    return { adds, removes };
  }

  create(element: Simple.Element | Element, _state: Opaque, args: Arguments) {
    const capturedArgs = args.capture();

    return new OnModifierState(<Element>element, capturedArgs);
  }

  getTag({ tag }: OnModifierState): Tag {
    return tag;
  }

  install(state: OnModifierState) {
    state.updateFromArgs();

    let { element, eventName, callback, options } = state;

    addEventListener(element, eventName, callback, options);

    state.shouldUpdate = false;
  }

  update(state: OnModifierState) {
    // stash prior state for el.removeEventListener
    let { element, eventName, callback, options } = state;

    state.updateFromArgs();

    if (!state.shouldUpdate) {
      return;
    }

    // use prior state values for removal
    removeEventListener(element, eventName, callback, options);

    // read updated values from the state object
    addEventListener(state.element, state.eventName, state.callback, state.options);

    state.shouldUpdate = false;
  }

  getDestructor(state: Destroyable) {
    return state;
  }
}
