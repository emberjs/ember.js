declare module '@ember/-internals/glimmer/lib/helpers/fn' {
  /**
    @module ember
    */
  /**
      The `fn` helper allows you to ensure a function that you are passing off
      to another component, helper, or modifier has access to arguments that are
      available in the template.

      For example, if you have an `each` helper looping over a number of items, you
      may need to pass a function that expects to receive the item as an argument
      to a component invoked within the loop. Here's how you could use the `fn`
      helper to pass both the function and its arguments together:

        ```app/templates/components/items-listing.hbs
      {{#each @items as |item|}}
        <DisplayItem @item=item @select={{fn this.handleSelected item}} />
      {{/each}}
      ```

      ```app/components/items-list.js
      import Component from '@glimmer/component';
      import { action } from '@ember/object';

      export default class ItemsList extends Component {
        @action
        handleSelected(item) {
          // ...snip...
        }
      }
      ```

      In this case the `display-item` component will receive a normal function
      that it can invoke. When it invokes the function, the `handleSelected`
      function will receive the `item` and any arguments passed, thanks to the
      `fn` helper.

      Let's take look at what that means in a couple circumstances:

      - When invoked as `this.args.select()` the `handleSelected` function will
        receive the `item` from the loop as its first and only argument.
      - When invoked as `this.args.select('foo')` the `handleSelected` function
        will receive the `item` from the loop as its first argument and the
        string `'foo'` as its second argument.

      In the example above, we used `@action` to ensure that `handleSelected` is
      properly bound to the `items-list`, but let's explore what happens if we
      left out `@action`:

      ```app/components/items-list.js
      import Component from '@glimmer/component';

      export default class ItemsList extends Component {
        handleSelected(item) {
          // ...snip...
        }
      }
      ```

      In this example, when `handleSelected` is invoked inside the `display-item`
      component, it will **not** have access to the component instance. In other
      words, it will have no `this` context, so please make sure your functions
      are bound (via `@action` or other means) before passing into `fn`!

      See also [partial application](https://en.wikipedia.org/wiki/Partial_application).

      @method fn
      @for @ember/helper
      @public
      @since 3.11.0
    */
  export {};
}
