declare module 'ember-testing/lib/helpers/current_path' {
  import type Application from '@ember/application';
  /**
      Returns the current path.

    Example:

    ```javascript
    function validateURL() {
      equal(currentPath(), 'some.path.index', "correct path was transitioned into.");
    }

    click('#some-link-id').then(validateURL);
    ```

    @method currentPath
    @return {Object} The currently active path.
    @since 1.5.0
    @public
    */
  export default function currentPath(app: Application): string | null;
}
