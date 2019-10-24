/**
A component is a reusable UI element that consists of a 
`.hbs` template and an optional JavaScript class that defines its behavior.
For example, someone might make a `button` in the template and handle
the click behavior in the JavaScript file that shares the same name
as the template.

The APIs available in a component
vary depending on whether they import from `@glimmer/component`
or the older "classic" type, `@ember/component`.
The documentation below covers 100% of the available methods, hooks,
and properties of `@glimmer/component`.

## Defining a component

To define a component, subclass `Component` and add your own properties,
methods and lifecycle hooks:

```javascript
import Component from '@glimmer/component';

export default class SomeComponent extends Component {
  // your code here 
}
```

@module @glimmer/component
@main @glimmer/component
@public
*/

/**
 @module ember
 */

/**
 @class GlimmerThings
 @public
*/

/**
Constructs a new component and assigns itself the passed properties.
@method constructor
@param options
@public
*/

/**
`didInsertElement` is called when the component has been inserted into the DOM.
Override this function to do any set up that requires an element in the document body.
@method didInsertElement
@public
*/

/**
`didUpdate` is called when the component has updated and rerendered itself.
It is called only during a rerender, not during an initial render.
@method didUpdate
@public
*/

/**
`willDestroy` is called before the component has been removed from the DOM.
@method willDestroy
@public
*/
