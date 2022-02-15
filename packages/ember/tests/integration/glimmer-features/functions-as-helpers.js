import { moduleFor, RenderingTestCase } from 'internal-test-helpers';
import { Component } from '@ember/-internals/glimmer';

// Initial implementation: https://github.com/glimmerjs/glimmer-vm/pull/1348
moduleFor(
  'Glimmer Features - functions as helpers',
  class extends RenderingTestCase {
    async ['@test plain functions work as helpers'](assert) {
      let count = 0;
      this.addComponent('demo', {
        template: `{{ (this.hello) }}`,
        ComponentClass: class Demo extends Component {
          hello = () => {
            count++;
            return 'plain function';
          };
        },
      });

      assert.equal(count, 0);

      this.render('<Demo />');

      assert.equal(count, 1);
    }
  }
);
