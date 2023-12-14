declare module '@ember/-internals/glimmer/lib/syntax/outlet' {
  /**
      The `{{outlet}}` helper lets you specify where a child route will render in
      your template. An important use of the `{{outlet}}` helper is in your
      application's `application.hbs` file:

      ```app/templates/application.hbs
      <MyHeader />

      <div class="my-dynamic-content">
        <!-- this content will change based on the current route, which depends on the current URL -->
        {{outlet}}
      </div>

      <MyFooter />
      ```

      See the [routing guide](https://guides.emberjs.com/release/routing/rendering-a-template/) for more
      information on how your `route` interacts with the `{{outlet}}` helper.
      Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

      @method outlet
      @for Ember.Templates.helpers
      @public
    */
  export const outletHelper: object;
}
