declare module '@ember/-internals/glimmer/lib/helpers/concat' {
  /**
    @module ember
    */
  /**
      Concatenates the given arguments into a string.

      Example:

      ```handlebars
      {{some-component name=(concat firstName " " lastName)}}

      {{! would pass name="<first name value> <last name value>" to the component}}
      ```

      or for angle bracket invocation, you actually don't need concat at all.

      ```handlebars
      <SomeComponent @name="{{firstName}} {{lastName}}" />
      ```

      @public
      @method concat
      @for @ember/helper
      @since 1.13.0
    */
  export {};
}
