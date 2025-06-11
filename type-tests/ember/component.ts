import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

class LayoutComponent extends Ember.Component {
  layoutName = 'my-layout';
}

const MyComponent = class extends Ember.Component {};
expectTypeOf(Ember.get(MyComponent, 'positionalParams')).toEqualTypeOf<string | string[]>();

class AnotherComponent extends Ember.Component {
  name = '';

  hello(name: string) {
    this.set('name', name);
    this.name = name;
  }
}

class Bindings extends Ember.Component {
  classNameBindings = ['propertyA', 'propertyB'];
  propertyA = 'from-a';

  @Ember.computed()
  get propertyB() {
    if (!this.get('propertyA')) {
      return 'from-b';
    }
  }
}
