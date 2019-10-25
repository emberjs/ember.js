/**
In order to tell Ember a value might change, we need to mark it as trackable.
Trackable values are values that:

- Can change over their component’s lifetime and
- Should cause Ember to rerender if and when they change

We can do this by marking the field with the @tracked decorator.

@module @glimmer/tracking
@public
*/

/**
 @class GlimmerTracking
 @public
 @static
*/

/**
Marks a property as tracked. For example, by default,
a component's properties are expected to be static,
meaning you are not able to update them and have the template update
accordingly. Marking a property as tracked means that when that
property changes, a rerender of the component is scheduled so the
template is kept up to date. 

@method tracked
@static
@for @glimmer/tracking
@public

```javascript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SomeComponent extends Component {
  @tracked item = 1;

  @action
  plusOne() {
    this.item += 1;
  }
}
```
*/