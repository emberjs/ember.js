declare module 'ember-testing/lib/helpers/visit' {
  import type { TestableApp } from 'ember-testing/lib/ext/application';
  /**
      Loads a route, sets up any controllers, and renders any templates associated
      with the route as though a real user had triggered the route change while
      using your app.

      Example:

      ```javascript
      visit('posts/index').then(function() {
        // assert something
      });
      ```

      @method visit
      @param {String} url the name of the route
      @return {RSVP.Promise<undefined>}
      @public
    */
  export default function visit(app: TestableApp, url: string): unknown;
}
