import EmberObject from '@ember/object';
import { removeObserver, addObserver } from '@ember/object/observers';

class MyComponent extends EmberObject {
  foo = 'bar';

  constructor() {
    super();
    this.addObserver('foo', this, 'fooDidChange');
    this.addObserver('foo', this, this.fooDidChange);
    addObserver(this, 'foo', this, 'fooDidChange');
    addObserver(this, 'foo', this, this.fooDidChange);
    this.removeObserver('foo', this, 'fooDidChange');
    this.removeObserver('foo', this, this.fooDidChange);
    removeObserver(this, 'foo', this, 'fooDidChange');
    removeObserver(this, 'foo', this, this.fooDidChange);
    const lambda = () => {
      this.fooDidChange(this, 'foo');
    };
    this.addObserver('foo', lambda);
    this.removeObserver('foo', lambda);
    addObserver(this, 'foo', lambda);
    removeObserver(this, 'foo', lambda);
  }

  fooDidChange(_sender: this, _key: string) {
    // your code
  }
}

const myComponent = MyComponent.create();
myComponent.addObserver('foo', null, () => {});
myComponent.set('foo', 'baz');
