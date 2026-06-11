/**
@module ember
*/

/**
  Concatenates the given arguments into a string.

  Example:

  ```gjs
  import { concat } from '@ember/helper';
    
  <template>
    {{yield (concat firstName " " lastName)}}

    {{! would yield name="<first name value> <last name value>" to the component}}
  </template>
  ```

  For angle bracket invocation of components, you actually don't need concat at all.

  ```handlebars
  <SomeComponent @name="{{firstName}} {{lastName}}" />
  ```

  @public
  @method concat
  @for @ember/helper
  @since 1.13.0
*/

export {};
