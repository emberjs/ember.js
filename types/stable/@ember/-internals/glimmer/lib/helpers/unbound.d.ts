declare module '@ember/-internals/glimmer/lib/helpers/unbound' {
  /**
    @module ember
    */
  /**
      The `{{unbound}}` helper disconnects the one-way binding of a property,
      essentially freezing its value at the moment of rendering. For example,
      in this example the display of the variable `name` will not change even
      if it is set with a new value:

      ```handlebars
      {{unbound this.name}}
      ```

      Like any helper, the `unbound` helper can accept a nested helper expression.
      This allows for custom helpers to be rendered unbound:

      ```handlebars
      {{unbound (some-custom-helper)}}
      {{unbound (capitalize this.name)}}
      {{! You can use any helper, including unbound, in a nested expression }}
      {{capitalize (unbound this.name)}}
      ```

      The `unbound` helper only accepts a single argument, and it return an
      unbound value.

      @method unbound
      @for Ember.Templates.helpers
      @public
    */
  const _default: object;
  export default _default;
}
