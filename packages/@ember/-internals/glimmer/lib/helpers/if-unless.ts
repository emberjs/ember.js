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

  ```app/templates/application.gjs
  import Weather from '../components/weather';
    
  <template>
    <Weather />
  </template>
  ```

  ```app/components/weather.gjs
  <template>
    {{! will not render because greeting is undefined}}
    {{#if @isRaining}}
      Yes, grab an umbrella!
    {{/if}}
  </template>
  ```

  You can also define what to show if the property is falsey by using
  the `else` helper.

  ```app/components/weather.gjs
  <template>
    {{#if @isRaining}}
      Yes, grab an umbrella!
    {{else}}
      No, it's lovely outside!
    {{/if}}
  </template>
  ```

  You are also able to combine `else` and `if` helpers to create more complex
  conditional logic.

  For the following template:

   ```app/components/weather.gjs
  <template>
    {{#if @isRaining}}
      Yes, grab an umbrella!
    {{else if @isCold}}
      Grab a coat, it's chilly!
    {{else}}
      No, it's lovely outside!
    {{/if}}
  </template>  
  ```

  If you call it by saying `isCold` is true:

  ```app/templates/application.gjs
  import Weather from '../components/weather';
    
  <template>
    <Weather @isCold={{true}} />
  </template>
  ```

  Then `Grab a coat, it's chilly!` will be rendered.

  ## Inline form

  The inline `if` helper conditionally renders a single property or string.

  In this form, the `if` helper receives three arguments, the conditional value,
  the value to render when truthy, and the value to render when falsey.

  For example, if `useLongGreeting` is truthy, the following:

  ```app/templates/application.gjs
  import Greeting from '../components/greeting';
  
  <template>
    <Greeting @useLongGreeting={{true}} />
  <template>
  ```

  ```app/components/greeting.gjs
  <template>
    {{if @useLongGreeting "Hello" "Hi"}} Alex
  <template>
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

  ```app/templates/application.gjs
  import Greeting from '../components/greeting';
    
  <template>
    <Greeting @useLongGreeting={{false}} />
  </template>
  ```

  ```app/components/greeting.gjs
  <template>
    {{unless @useLongGreeting "Hi" "Hello"}} Ben
  </template>
  ```

  Then it will display:

  ```html
  Hi Ben
  ```

  ## Block form

  Like the `if` helper, the `unless` helper also has a block form.

  The following will not render anything:

  ```app/templates/application.gjs
  import Greeting from '../components/greeting';
    
  <template>
    <Greeting />
  </template>
  ```

  ```app/components/greeting.gjs
  <template>
    {{#unless @greeting}}
      No greeting was found. Why not set one?
    {{/unless}}
  </template>
  ```

  You can also use an `else` helper with the `unless` block. The
  `else` will display if the value is truthy.

  If you have the following component:

  ```app/components/logged-in.gjs
  <template>
    {{#unless @userData}}
      Please login.
    {{else}}
      Welcome back!
    {{/unless}}
  </template>
  ```

  Calling it with a truthy `userData`:

  ```app/templates/application.gjs
  import LoggedIn from '../components/logged-in';
    
  <template>
    <LoggedIn @userData={{hash username="Zoey"}} />
  </template>
  ```

  Will render:

  ```html
  Welcome back!
  ```

  and calling it with a falsey `userData`:

  ```app/templates/application.gjs
  import LoggedIn from '../components/logged-in';

  <template>
    <LoggedIn @userData={{false}} />
  </template>
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
