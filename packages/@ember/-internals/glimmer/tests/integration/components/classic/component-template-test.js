import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';
import { Component as EmberComponent } from '../../../utils/helpers';

moduleFor(
  'Components test: setComponentTemplate (classic component)',
  class extends RenderingTestCase {
    '@test templates set with setComponentTemplate are inherited (EmberObject.extend())'() {
      let Parent = setComponentTemplate(
        precompileTemplate('hello'),
        class extends EmberComponent {}
      );

      this.owner.register('component:foo-bar', class extends Parent {});

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }
  }
);
