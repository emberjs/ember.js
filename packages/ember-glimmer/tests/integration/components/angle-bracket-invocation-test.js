import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';

moduleFor(
  'AngleBracket Invocation',
  class extends RenderingTest {
    '@test it can render a basic template only component'() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      this.runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can render a basic component with template and javascript'() {
      this.registerComponent('foo-bar', {
        template: 'FIZZ BAR {{local}}',
        ComponentClass: Component.extend({ local: 'hey' }),
      });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'FIZZ BAR hey' });
    }
  }
);
