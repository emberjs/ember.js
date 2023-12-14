declare module 'ember-testing/lib/helpers/current_url' {
  import type Application from '@ember/application';
  /**
      Returns the current URL.

    Example:

    ```javascript
    function validateURL() {
      equal(currentURL(), '/some/path', "correct URL was transitioned into.");
    }

    click('#some-link-id').then(validateURL);
    ```

    @method currentURL
    @return {Object} The currently active URL.
    @since 1.5.0
    @public
    */
  export default function currentURL(app: Application): string;
}
