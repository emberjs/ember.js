declare module '@ember/-internals/metal/lib/expand_properties' {
  /**
      Expands `pattern`, invoking `callback` for each expansion.

      The only pattern supported is brace-expansion, anything else will be passed
      once to `callback` directly.

      Example

      ```js
      import { expandProperties } from '@ember/object/computed';

      function echo(arg){ console.log(arg); }

      expandProperties('foo.bar', echo);              //=> 'foo.bar'
      expandProperties('{foo,bar}', echo);            //=> 'foo', 'bar'
      expandProperties('foo.{bar,baz}', echo);        //=> 'foo.bar', 'foo.baz'
      expandProperties('{foo,bar}.baz', echo);        //=> 'foo.baz', 'bar.baz'
      expandProperties('foo.{bar,baz}.[]', echo)      //=> 'foo.bar.[]', 'foo.baz.[]'
      expandProperties('{foo,bar}.{spam,eggs}', echo) //=> 'foo.spam', 'foo.eggs', 'bar.spam', 'bar.eggs'
      expandProperties('{foo}.bar.{baz}')             //=> 'foo.bar.baz'
      ```

      @method expandProperties
      @static
      @for @ember/object/computed
      @public
      @param {String} pattern The property pattern to expand.
      @param {Function} callback The callback to invoke.  It is invoked once per
      expansion, and is passed the expansion.
    */
  export default function expandProperties(
    pattern: string,
    callback: (expansion: string) => void
  ): void;
}
