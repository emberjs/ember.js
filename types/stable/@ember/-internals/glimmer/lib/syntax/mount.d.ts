declare module '@ember/-internals/glimmer/lib/syntax/mount' {
  /**
      The `{{mount}}` helper lets you embed a routeless engine in a template.
      Mounting an engine will cause an instance to be booted and its `application`
      template to be rendered.

      For example, the following template mounts the `ember-chat` engine:

      ```handlebars
      {{! application.hbs }}
      {{mount "ember-chat"}}
      ```

      Additionally, you can also pass in a `model` argument that will be
      set as the engines model. This can be an existing object:

      ```
      <div>
        {{mount 'admin' model=userSettings}}
      </div>
      ```

      Or an inline `hash`, and you can even pass components:

      ```
      <div>
        <h1>Application template!</h1>
        {{mount 'admin' model=(hash
            title='Secret Admin'
            signInButton=(component 'sign-in-button')
        )}}
      </div>
      ```

      @method mount
      @param {String} name Name of the engine to mount.
      @param {Object} [model] Object that will be set as
                              the model of the engine.
      @for Ember.Templates.helpers
      @public
    */
  export const mountHelper: object;
}
