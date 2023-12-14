declare module '@ember/-internals/glimmer/lib/helpers/modifier' {
  /**
     @module ember
     */
  /**
     Use the `{{modifier}}` helper to create contextual modifier so
     that it can be passed around as first-class values in templates.

     ```handlebars
     {{#let (modifier "click-outside" click=this.submit) as |on-click-outside|}}

       {{!-- this is equivalent to `<MyComponent {{click-outside click=this.submit}} />` --}}
       <MyComponent {{on-click-outside}} />

       {{!-- this will pass the modifier itself into the component, instead of invoking it now --}}
       <MyComponent @modifier={{modifier on-click-outside "extra" "args"}} />

       {{!-- this will yield the modifier itself ("contextual modifier"), instead of invoking it now --}}
       {{yield on-click-outside}}
     {{/let}}
     ```

     ### Arguments

     The `{{modifier}}` helper works similarly to the [`{{component}}`](./component?anchor=component) and
     [`{{helper}}`](./helper?anchor=helper) helper:

     * When passed a string (e.g. `(modifier "foo")`) as the first argument,
       it will produce an opaque, internal "modifier definition" object
       that can be passed around and invoked elsewhere.

     * Any additional positional and/or named arguments (a.k.a. params and hash)
       will be stored ("curried") inside the definition object, such that, when invoked,
       these arguments will be passed along to the referenced modifier.

     @method modifier
     @for Ember.Templates.helpers
     @public
     @since 3.27.0
     */
  export {};
}
