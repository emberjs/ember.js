import type {
  CapturedArguments,
  InternalModifierManager,
  Owner,
  SimpleElement,
  UpdatableTag,
} from '@glimmer/interfaces';
import {
  check,
  CheckBoolean,
  CheckFunction,
  CheckOr,
  CheckString,
  CheckUndefined,
} from '@glimmer/debug';
import { registerDestructor } from '@glimmer/destroyable';
import { setInternalModifierManager } from '@glimmer/manager';
import { valueForRef } from '@glimmer/reference';
import { assert, buildUntouchableThis } from '@glimmer/util';
import { createUpdatableTag } from '@glimmer/validator';

import { reifyNamed } from '../vm/arguments';

const untouchableContext = buildUntouchableThis('`on` modifier');

interface Listener {
  eventName: string;
  callback: EventListener;
  userProvidedCallback: EventListener;
  once: boolean | undefined;
  passive: boolean | undefined;
  capture: boolean | undefined;
  options: AddEventListenerOptions | undefined;
}

export class OnModifierState {
  public tag = createUpdatableTag();
  public element: Element;
  public args: CapturedArguments;
  public listener: Listener | null = null;

  constructor(element: Element, args: CapturedArguments) {
    this.element = element;
    this.args = args;

    registerDestructor(this, () => {
      let { element, listener } = this;
      if (listener) {
        let { eventName, callback, options } = listener;
        removeEventListener(element, eventName, callback, options);
      }
    });
  }

  // Update this.listener if needed
  updateListener(): void {
    let { element, args, listener } = this;

    assert(
      args.positional[0],
      'You must pass a valid DOM event name as the first argument to the `on` modifier'
    );

    let eventName = check(
      valueForRef(args.positional[0]),
      CheckString,
      () => 'You must pass a valid DOM event name as the first argument to the `on` modifier'
    );

    assert(
      args.positional[1],
      'You must pass a function as the second argument to the `on` modifier'
    );

    let userProvidedCallback = check(valueForRef(args.positional[1]), CheckFunction, (actual) => {
      return `You must pass a function as the second argument to the \`on\` modifier; you passed ${
        actual === null ? 'null' : typeof actual
      }. While rendering:\n\n${args.positional[1]?.debugLabel ?? `{unlabeled value}`}`;
    }) as EventListener;

    if (import.meta.env.DEV && args.positional.length !== 2) {
      throw new Error(
        `You can only pass two positional arguments (event name and callback) to the \`on\` modifier, but you provided ${args.positional.length}. Consider using the \`fn\` helper to provide additional arguments to the \`on\` callback.`
      );
    }

    let once: boolean | undefined = undefined;
    let passive: boolean | undefined = undefined;
    let capture: boolean | undefined = undefined;

    if (import.meta.env.DEV) {
      let { once: _once, passive: _passive, capture: _capture, ...extra } = reifyNamed(args.named);

      once = check(_once, CheckOr(CheckBoolean, CheckUndefined), (actual) => {
        return `You must pass a boolean or undefined as the \`once\` argument to the \`on\` modifier; you passed ${actual}. While rendering:\n\n${
          args.named['once']!.debugLabel ?? `{unlabeled value}`
        }`;
      });

      passive = check(_passive, CheckOr(CheckBoolean, CheckUndefined), (actual) => {
        return `You must pass a boolean or undefined as the \`passive\` argument to the \`on\` modifier; you passed ${actual}. While rendering:\n\n${
          args.named['passive']!.debugLabel ?? `{unlabeled value}`
        }`;
      });

      capture = check(_capture, CheckOr(CheckBoolean, CheckUndefined), (actual) => {
        return `You must pass a boolean or undefined as the \`capture\` argument to the \`on\` modifier; you passed ${actual}. While rendering:\n\n${
          args.named['capture']!.debugLabel ?? `{unlabeled value}`
        }`;
      });

      if (Object.keys(extra).length > 0) {
        throw new Error(
          `You can only \`once\`, \`passive\` or \`capture\` named arguments to the \`on\` modifier, but you provided ${Object.keys(
            extra
          ).join(', ')}.`
        );
      }
    } else {
      let { once: _once, passive: _passive, capture: _capture } = args.named;

      if (_once) {
        once = valueForRef(_once) as boolean | undefined;
      }

      if (_passive) {
        passive = valueForRef(_passive) as boolean | undefined;
      }

      if (_capture) {
        capture = valueForRef(_capture) as boolean | undefined;
      }
    }

    let shouldUpdate = false;

    if (listener === null) {
      shouldUpdate = true;
    } else {
      shouldUpdate =
        eventName !== listener.eventName ||
        userProvidedCallback !== listener.userProvidedCallback ||
        once !== listener.once ||
        passive !== listener.passive ||
        capture !== listener.capture;
    }

    let options: AddEventListenerOptions | undefined = undefined;

    // we want to handle both `true` and `false` because both have a meaning:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=770208
    if (shouldUpdate) {
      if (once !== undefined || passive !== undefined || capture !== undefined) {
        options = { once, passive, capture } as AddEventListenerOptions;
      }
    }

    if (shouldUpdate) {
      let callback = userProvidedCallback;

      if (import.meta.env.DEV) {
        callback = userProvidedCallback.bind(untouchableContext);

        if (passive) {
          let _callback = callback;

          callback = (event) => {
            event.preventDefault = () => {
              throw new Error(
                `You marked this listener as 'passive', meaning that you must not call 'event.preventDefault()': \n\n${
                  userProvidedCallback.name ?? `{anonymous function}`
                }`
              );
            };

            return _callback(event);
          };
        }
      }

      this.listener = {
        eventName,
        callback,
        userProvidedCallback,
        once,
        passive,
        capture,
        options,
      };

      if (listener) {
        removeEventListener(element, listener.eventName, listener.callback, listener.options);
      }

      addEventListener(element, eventName, callback, options);
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

  element.removeEventListener(eventName, callback, options);
}

function addEventListener(
  element: Element,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): void {
  adds++;
  element.addEventListener(eventName, callback, options);
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
class OnModifierManager implements InternalModifierManager<OnModifierState, object> {
  getDebugName(): string {
    return 'on';
  }

  getDebugInstance(): unknown {
    return null;
  }

  get counters(): { adds: number; removes: number } {
    return { adds, removes };
  }

  create(
    _owner: Owner,
    element: SimpleElement | Element,
    _state: object,
    args: CapturedArguments
  ): OnModifierState {
    return new OnModifierState(element as Element, args);
  }

  getTag({ tag }: OnModifierState): UpdatableTag {
    return tag;
  }

  install(state: OnModifierState): void {
    state.updateListener();
  }

  update(state: OnModifierState): void {
    state.updateListener();
  }

  getDestroyable(state: OnModifierState): OnModifierState {
    return state;
  }
}

export const on = setInternalModifierManager(new OnModifierManager(), {});
