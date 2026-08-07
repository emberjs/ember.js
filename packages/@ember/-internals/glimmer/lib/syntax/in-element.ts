/**
 @module ember
 */

/**
 The `in-element` helper renders its block content outside of the regular flow,
 into a DOM element given by its `destinationElement` positional argument.

 Common use cases - often referred to as "portals" or "wormholes" - are rendering
 dropdowns, modals or tooltips close to the root of the page to bypass CSS overflow
 rules, or to render content to parts of the page that are outside of the control
 of the Ember app itself (e.g. embedded into a static or server rendered HTML page).

 ```handlebars
 {{#in-element this.destinationElement}}
   <div>Some content</div>
 {{/in-element}}
 ```

 ### Arguments

 `{{in-element}}` requires a single positional argument:

 - `destinationElement` -- the DOM element, `DocumentFragment`, or `ShadowRoot` to
 render into. It must exist at the time of rendering.

 When the destination is a `DocumentFragment`, appending the fragment to the DOM
 moves its children into the new parent. Content rendered by `{{in-element}}`
 follows that move: subsequent updates apply to the content in its new location,
 and destroying the block removes the content from its new location.

 It also supports an optional named argument:

 - `insertBefore` -- by default the DOM element's content is replaced when used as
 `destinationElement`. Passing `null` to `insertBefore` changes the behaviour to
 append the block content to the end of any existing content. Any other value than
 `null` is currently not supported.

     For example:

     ```handlebars
     {{#in-element this.destinationElement insertBefore=null}}
       <div>Some content</div>
     {{/in-element}}
     ```

 `in-element` is built-in and does not need to be imported.
 
 @method in-element
 @for Ember.Templates.helpers
 @public
 */

export {};
