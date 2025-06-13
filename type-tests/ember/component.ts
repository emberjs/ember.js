import Ember from 'ember';
import { set } from '@ember/object';
import { expectTypeOf } from 'expect-type';

class LayoutComponent extends Ember.Component {
  layoutName = 'my-layout';
}

const MyComponent = class extends Ember.Component {};
expectTypeOf(Ember.get(MyComponent, 'positionalParams')).toEqualTypeOf<string | string[]>();

class AnotherComponent extends Ember.Component {
  name = '';

  hello(name: string) {
    set(this, 'name', name);
    this.name = name;
  }
}

class Bindings extends Ember.Component {
  classNameBindings = ['propertyA', 'propertyB'];
  propertyA = 'from-a';

  @Ember.computed()
  get propertyB() {
    if (!this.propertyA) {
      return 'from-b';
    }
  }
}
