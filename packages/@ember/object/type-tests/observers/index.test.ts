import { removeObserver, addObserver } from '@ember/object/observers';

class MyComponent {
  foo = 'bar';

  constructor() {
    addObserver(this, 'foo', this, 'fooDidChange');

    addObserver(this, 'foo', this, this.fooDidChange);
    removeObserver(this, 'foo', this, 'fooDidChange');

    removeObserver(this, 'foo', this, this.fooDidChange);
    const lambda = () => {
      this.fooDidChange(this, 'foo');
    };
    addObserver(this, 'foo', lambda);
    removeObserver(this, 'foo', lambda);
  }

  fooDidChange(_sender: this, _key: string) {
    // your code
  }
}

new MyComponent();
