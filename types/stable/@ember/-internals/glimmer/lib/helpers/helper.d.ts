declare module '@ember/-internals/glimmer/lib/helpers/helper' {
  /**
     @module ember
     */
  /**
     Use the `{{helper}}` helper to create contextual helper so
     that it can be passed around as first-class values in templates.

     ```handlebars
     {{#let (helper "join-words" "foo" "bar" separator=" ") as |foo-bar|}}

       {{!-- this is equivalent to invoking `{{join-words "foo" "bar" separator=" "}}` --}}
       {{foo-bar}}

       {{!-- this will pass the helper itself into the component, instead of invoking it now --}}
       <MyComponent @helper={{helper foo-bar "baz"}} />

       {{!-- this will yield the helper itself ("contextual helper"), instead of invoking it now --}}
       {{yield foo-bar}}
     {{/let}}
     ```

     ### Arguments

     The `{{helper}}` helper works similarly to the [`{{component}}`](./component?anchor=component) and
     [`{{modifier}}`](./modifier?anchor=modifier) helper:

     * When passed a string (e.g. `(helper "foo")`) as the first argument,
       it will produce an opaque, internal "helper definition" object
       that can be passed around and invoked elsewhere.

     * Any additional positional and/or named arguments (a.k.a. params and hash)
       will be stored ("curried") inside the definition object, such that, when invoked,
       these arguments will be passed along to the referenced helper.


     @method helper
     @for Ember.Templates.helpers
     @public
     @since 3.27.0
     */
  export {};
}
