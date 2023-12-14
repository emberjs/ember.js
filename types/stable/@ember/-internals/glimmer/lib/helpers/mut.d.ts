declare module '@ember/-internals/glimmer/lib/helpers/mut' {
  /**
      The `mut` helper lets you __clearly specify__ that a child `Component` can update the
      (mutable) value passed to it, which will __change the value of the parent component__.

      To specify that a parameter is mutable, when invoking the child `Component`:

      ```handlebars
      <MyChild @childClickCount={{fn (mut totalClicks)}} />
      ```

       or

      ```handlebars
      {{my-child childClickCount=(mut totalClicks)}}
      ```

      The child `Component` can then modify the parent's value just by modifying its own
      property:

      ```javascript
      // my-child.js
      export default Component.extend({
        click() {
          this.incrementProperty('childClickCount');
        }
      });
      ```

      Note that for curly components (`{{my-component}}`) the bindings are already mutable,
      making the `mut` unnecessary.

      Additionally, the `mut` helper can be combined with the `fn` helper to
      mutate a value. For example:

      ```handlebars
      <MyChild @childClickCount={{this.totalClicks}} @click-count-change={{fn (mut totalClicks))}} />
      ```

      or

      ```handlebars
      {{my-child childClickCount=totalClicks click-count-change=(fn (mut totalClicks))}}
      ```

      The child `Component` would invoke the function with the new click value:

      ```javascript
      // my-child.js
      export default Component.extend({
        click() {
          this.get('click-count-change')(this.get('childClickCount') + 1);
        }
      });
      ```

      The `mut` helper changes the `totalClicks` value to what was provided as the `fn` argument.

      The `mut` helper, when used with `fn`, will return a function that
      sets the value passed to `mut` to its first argument. As an example, we can create a
      button that increments a value passing the value directly to the `fn`:

      ```handlebars
      {{! inc helper is not provided by Ember }}
      <button onclick={{fn (mut count) (inc count)}}>
        Increment count
      </button>
      ```

      @method mut
      @param {Object} [attr] the "two-way" attribute that can be modified.
      @for Ember.Templates.helpers
      @public
    */
  const _default: object;
  export default _default;
}
