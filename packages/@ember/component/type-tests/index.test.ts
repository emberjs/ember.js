import Component from '@ember/component';
import { CoreView } from '@ember/-internals/views';
import { expectTypeOf } from 'expect-type';
import { Owner } from '@ember/-internals/owner';
import { View } from '@ember/-internals/glimmer/lib/renderer';
import { action } from '@ember/object';
import { tracked } from '@ember/-internals/metal';

// NOTE: This is invalid, but acceptable for type tests
let owner = {} as Owner;
let component = new Component(owner);

expectTypeOf(component).toMatchTypeOf<CoreView>();
expectTypeOf(component).toMatchTypeOf<View>();

class MyComponent extends Component {
  tagName = 'em';
  classNames = ['my-class', 'my-other-class'];
  classNameBindings = ['propertyA', 'propertyB'];
  attributeBindings = ['href'];

  @tracked propertyA = 'from-a';

  get propertyB(): string | void {
    if (this.propertyA === 'from-a') {
      return 'from-b';
    }
  }

  @tracked href = 'https://tilde.io';

  @action click(_event: Event): void {
    // Clicked!
  }
}
new MyComponent(owner);

class BadComponent extends Component {
  // @ts-expect-error invalid tag name
  tagName = 1;

  // @ts-expect-error invalid classname
  classNames = 'foo';

  // @ts-expect-error invalid classNameBindings
  classNameBindings = [1];

  // @ts-expect-error invalid attributeBindings
  attributeBindings = [true];
}
new BadComponent(owner);
