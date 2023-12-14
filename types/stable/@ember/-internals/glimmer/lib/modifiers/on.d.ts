declare module '@ember/-internals/glimmer/lib/modifiers/on' {
  /**
    @module ember
    */
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
        @action
        saveLike() {
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

      In the example above, we used `@action` to ensure that `likePost` is
      properly bound to the `items-list`, but let's explore what happens if we
      left out `@action`:

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
      are bound (via `@action` or other means) before passing into `on`!

      @method on
      @for Ember.Templates.helpers
      @public
      @since 3.11.0
    */
  export {};
}
