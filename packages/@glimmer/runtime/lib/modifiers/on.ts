import { check, CheckFunction, CheckString } from '@glimmer/debug';
import { registerDestructor } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import {
  CapturedArguments,
  InternalModifierManager,
  Owner,
  SimpleElement,
} from '@glimmer/interfaces';
import { setInternalModifierManager } from '@glimmer/manager';
import { valueForRef } from '@glimmer/reference';
import { buildUntouchableThis, expect } from '@glimmer/util';
import { createUpdatableTag, UpdatableTag } from '@glimmer/validator';

import { reifyNamed } from '../vm/arguments';

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
  public tag = createUpdatableTag();
  public element: Element;
  public args: CapturedArguments;
  public declare eventName: string;
  public declare callback: EventListener;
  private declare userProvidedCallback: EventListener;
  public once?: boolean | undefined;
  public passive?: boolean | undefined;
  public capture?: boolean | undefined;
  public options?: AddEventListenerOptions | undefined;
  public shouldUpdate = true;

  constructor(element: Element, args: CapturedArguments) {
    this.element = element;
    this.args = args;
  }

  updateFromArgs(): void {
    let { args } = this;

    let { once, passive, capture }: AddEventListenerOptions = reifyNamed(args.named);
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
    // we want to handle both `true` and `false` because both have a meaning:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=770208
    if (once !== undefined || passive !== undefined || capture !== undefined) {
      options = this.options = { once, passive, capture } as AddEventListenerOptions;
    } else {
      this.options = undefined;
    }

    let first = expect(
      args.positional[0],
      'You must pass a valid DOM event name as the first argument to the `on` modifier'
    );

    let eventName = check(
      valueForRef(first),
      CheckString,
      () => 'You must pass a valid DOM event name as the first argument to the `on` modifier'
    );

    if (eventName !== this.eventName) {
      this.eventName = eventName;
      this.shouldUpdate = true;
    }

    const userProvidedCallbackReference = expect(
      args.positional[1],
      'You must pass a function as the second argument to the `on` modifier'
    );

    const userProvidedCallback = check(
      valueForRef(userProvidedCallbackReference),
      CheckFunction,
      (actual) => {
        return `You must pass a function as the second argument to the \`on\` modifier; you passed ${
          actual === null ? 'null' : typeof actual
        }. While rendering:\n\n${userProvidedCallbackReference.debugLabel}`;
      }
    ) as EventListener;

    if (userProvidedCallback !== this.userProvidedCallback) {
      this.userProvidedCallback = userProvidedCallback;
      this.shouldUpdate = true;
    }

    if (DEBUG && args.positional.length !== 2) {
      throw new Error(
        `You can only pass two positional arguments (event name and callback) to the \`on\` modifier, but you provided ${args.positional.length}. Consider using the \`fn\` helper to provide additional arguments to the \`on\` callback.`
      );
    }

    let needsCustomCallback =
      (SUPPORTS_EVENT_OPTIONS === false && once) /* needs manual once implementation */ ||
      (DEBUG && passive); /* needs passive enforcement */

    if (this.shouldUpdate) {
      if (needsCustomCallback) {
        let callback = (this.callback = function (this: Element, event) {
          if (DEBUG && passive) {
            event.preventDefault = () => {
              throw new Error(
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

/**
  The `{{on}}` modifier lets you easily add event listeners (it uses
  [EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
  internally).

  For example, if you'd like to run a function on your component when a `<button>`
  in the components template is clicked you might do something like:

  ```app/components/like-post.hbs
  <button {{on 'click' this.saveLike}}>Like this post!</button>
  ```

  ```app/components/like-post.js
  import Component from '@glimmer/component';
  import { action } from '@ember/object';

  export default class LikePostComponent extends Component {
    saveLike = () => {
      // someone likes your post!
      // better send a request off to your server...
    }
  }
  ```

  ### Arguments

  `{{on}}` accepts two positional arguments, and a few named arguments.

  The positional arguments are:

  - `event` -- the name to use when calling `addEventListener`
  - `callback` -- the function to be passed to `addEventListener`

  The named arguments are:

  - capture -- a `true` value indicates that events of this type will be dispatched
    to the registered listener before being dispatched to any EventTarget beneath it
    in the DOM tree.
  - once -- indicates that the listener should be invoked at most once after being
    added. If true, the listener would be automatically removed when invoked.
  - passive -- if `true`, indicates that the function specified by listener will never
    call preventDefault(). If a passive listener does call preventDefault(), the user
    agent will do nothing other than generate a console warning. See
    [Improving scrolling performance with passive listeners](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Improving_scrolling_performance_with_passive_listeners)
    to learn more.

  The callback function passed to `{{on}}` will receive any arguments that are passed
  to the event handler. Most commonly this would be the `event` itself.

  If you would like to pass additional arguments to the function you should use
  the `{{fn}}` helper.

  For example, in our example case above if you'd like to pass in the post that
  was being liked when the button is clicked you could do something like:

  ```app/components/like-post.hbs
  <button {{on 'click' (fn this.saveLike @post)}}>Like this post!</button>
  ```

  In this case, the `saveLike` function will receive two arguments: the click event
  and the value of `@post`.

  ### Function Context

  In the example above, we used an arrow function to ensure that `likePost` is
  properly bound to the `items-list`, but let's explore what happens if we
  left out the arrow function:

  ```app/components/like-post.js
  import Component from '@glimmer/component';

  export default class LikePostComponent extends Component {
    saveLike() {
      // ...snip...
    }
  }
  ```

  In this example, when the button is clicked `saveLike` will be invoked,
  it will **not** have access to the component instance. In other
  words, it will have no `this` context, so please make sure your functions
  are bound (via an arrow function or other means) before passing into `on`!

  @method on
  @public
*/
class OnModifierManager implements InternalModifierManager<OnModifierState | null, object> {
  public SUPPORTS_EVENT_OPTIONS: boolean = SUPPORTS_EVENT_OPTIONS;

  getDebugName(): string {
    return 'on';
  }

  get counters(): { adds: number; removes: number } {
    return { adds, removes };
  }

  create(
    _owner: Owner,
    element: SimpleElement | Element,
    _state: object,
    args: CapturedArguments
  ): OnModifierState | null {
    return new OnModifierState(element as Element, args);
  }

  getTag(state: OnModifierState | null): UpdatableTag | null {
    if (state === null) {
      return null;
    }

    return state.tag;
  }

  install(state: OnModifierState | null): void {
    if (state === null) {
      return;
    }

    state.updateFromArgs();

    let { element, eventName, callback, options } = state;

    addEventListener(element, eventName, callback, options);

    registerDestructor(state, () => removeEventListener(element, eventName, callback, options));

    state.shouldUpdate = false;
  }

  update(state: OnModifierState | null): void {
    if (state === null) {
      return;
    }

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

  getDestroyable(state: OnModifierState | null): OnModifierState | null {
    return state;
  }
}

export default setInternalModifierManager(new OnModifierManager(), {});
