declare module '@ember/-internals/glimmer/lib/helpers/if-unless' {
  /**
    @module ember
    */
  /**
      The `if` helper allows you to conditionally render one of two branches,
      depending on the "truthiness" of a property.
      For example the following values are all falsey: `false`, `undefined`, `null`, `""`, `0`, `NaN` or an empty array.

      This helper has two forms, block and inline.

      ## Block form

      You can use the block form of `if` to conditionally render a section of the template.

      To use it, pass the conditional value to the `if` helper,
      using the block form to wrap the section of template you want to conditionally render.
      Like so:

      ```app/templates/application.hbs
      <Weather />
      ```

      ```app/components/weather.hbs
      {{! will not render because greeting is undefined}}
      {{#if @isRaining}}
        Yes, grab an umbrella!
      {{/if}}
      ```

      You can also define what to show if the property is falsey by using
      the `else` helper.

      ```app/components/weather.hbs
      {{#if @isRaining}}
        Yes, grab an umbrella!
      {{else}}
        No, it's lovely outside!
      {{/if}}
      ```

      You are also able to combine `else` and `if` helpers to create more complex
      conditional logic.

      For the following template:

       ```app/components/weather.hbs
      {{#if @isRaining}}
        Yes, grab an umbrella!
      {{else if @isCold}}
        Grab a coat, it's chilly!
      {{else}}
        No, it's lovely outside!
      {{/if}}
      ```

      If you call it by saying `isCold` is true:

      ```app/templates/application.hbs
      <Weather @isCold={{true}} />
      ```

      Then `Grab a coat, it's chilly!` will be rendered.

      ## Inline form

      The inline `if` helper conditionally renders a single property or string.

      In this form, the `if` helper receives three arguments, the conditional value,
      the value to render when truthy, and the value to render when falsey.

      For example, if `useLongGreeting` is truthy, the following:

      ```app/templates/application.hbs
      <Greeting @useLongGreeting={{true}} />
      ```

      ```app/components/greeting.hbs
      {{if @useLongGreeting "Hello" "Hi"}} Alex
      ```

      Will render:

      ```html
      Hello Alex
      ```

      One detail to keep in mind is that both branches of the `if` helper will be evaluated,
      so if you have `{{if condition "foo" (expensive-operation "bar")`,
      `expensive-operation` will always calculate.

      @method if
      @for Ember.Templates.helpers
      @public
    */
  /**
      The `unless` helper is the inverse of the `if` helper. It displays if a value
      is falsey ("not true" or "is false"). Example values that will display with
      `unless`: `false`, `undefined`, `null`, `""`, `0`, `NaN` or an empty array.

      ## Inline form

      The inline `unless` helper conditionally renders a single property or string.
      This helper acts like a ternary operator. If the first property is falsy,
      the second argument will be displayed, otherwise, the third argument will be
      displayed

      For example, if you pass a falsey `useLongGreeting` to the `Greeting` component:

      ```app/templates/application.hbs
      <Greeting @useLongGreeting={{false}} />
      ```

      ```app/components/greeting.hbs
      {{unless @useLongGreeting "Hi" "Hello"}} Ben
      ```

      Then it will display:

      ```html
      Hi Ben
      ```

      ## Block form

      Like the `if` helper, the `unless` helper also has a block form.

      The following will not render anything:

      ```app/templates/application.hbs
      <Greeting />
      ```

      ```app/components/greeting.hbs
      {{#unless @greeting}}
        No greeting was found. Why not set one?
      {{/unless}}
      ```

      You can also use an `else` helper with the `unless` block. The
      `else` will display if the value is truthy.

      If you have the following component:

      ```app/components/logged-in.hbs
      {{#unless @userData}}
        Please login.
      {{else}}
        Welcome back!
      {{/unless}}
      ```

      Calling it with a truthy `userData`:

      ```app/templates/application.hbs
      <LoggedIn @userData={{hash username="Zoey"}} />
      ```

      Will render:

      ```html
      Welcome back!
      ```

      and calling it with a falsey `userData`:

      ```app/templates/application.hbs
      <LoggedIn @userData={{false}} />
      ```

      Will render:

      ```html
      Please login.
      ```

      @method unless
      @for Ember.Templates.helpers
      @public
    */
  export {};
}
