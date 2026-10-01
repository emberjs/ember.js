import {
  moduleFor,
  RenderingTestCase,
  runTask,
  expectClassicComponentDeprecation,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';
import { Component as EmberComponent } from '../../../utils/helpers';

if (!DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved) {
  moduleFor(
    'Components test: setComponentTemplate (classic component)',
    class extends RenderingTestCase {
      '@test templates set with setComponentTemplate are inherited (EmberObject.extend())'() {
        expectClassicComponentDeprecation();

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
}
