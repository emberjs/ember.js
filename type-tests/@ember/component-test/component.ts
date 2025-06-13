import Component from '@ember/component';
import Object, { computed, get } from '@ember/object';
import { expectTypeOf } from 'expect-type';

class LayoutComponent extends Component {
  layoutName = 'my-layout';
}

const MyComponent = class extends Component {};
expectTypeOf(get(MyComponent, 'positionalParams')).toEqualTypeOf<string | string[]>();

class AnotherComponent extends Component {
  name = '';

  init() {
    super.init();
  }

  hello(name: string) {
    this.set('name', name);
    this.name = name;
  }
}

class Bindings extends Component {
  classNameBindings = ['propertyA', 'propertyB'];
  propertyA = 'from-a';

  @computed()
  get propertyB() {
    if (!this.get('propertyA')) {
      return 'from-b';
    }
  }
}

class Message extends Object {
  empty = false;
}

declare function someLogic(): boolean;

interface MySig {
  Args: {
    Named: {
      name: string;
      age: number;
    };
    Positional: [action: () => void];
  };
}

// These type helpers are stolen (and tweaked) from Glimmer and Glint internals
// just to demo that this actually has the expected behavior with a signature
// and an Ember component
type GetWithFallback<T, K, Fallback> = K extends keyof T ? T[K] : Fallback;
type NamedArgsFor<T> = GetWithFallback<GetWithFallback<T, 'Args', {}>, 'Named', object>;

interface SigExample extends NamedArgsFor<MySig> {}
class SigExample extends Component<MySig> {
  get accessArgs() {
    const { name, age } = this;

    expectTypeOf(name).toBeString();
    expectTypeOf(age).toBeNumber();

    return `${name} is ${age} years old`;
  }
}

// There is no type safety mapping `Element` here
class ElementOnComponent extends Component<{ Element: HTMLDivElement }> {
  get hmm(): boolean {
    return this.element?.dispatchEvent(new Event('mousedown')) ?? false;
  }
}
