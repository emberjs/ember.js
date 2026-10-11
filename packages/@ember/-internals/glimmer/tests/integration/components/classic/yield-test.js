import { RenderingTestCase, moduleFor } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { Component as EmberComponent } from '../../../utils/helpers';

moduleFor(
  'Helpers test: {{yield}} helper (classic component)',
  class extends RenderingTestCase {
    // INUR not need with no data update
    ['@test yield should not introduce a view'](assert) {
      let ParentCompComponent = class extends EmberComponent {
        isParentComponent = true;
      };

      let ChildCompComponent = class extends EmberComponent {
        didReceiveAttrs() {
          super.didReceiveAttrs();
          let parentView = this.get('parentView');

          assert.ok(parentView.get('isParentComponent'));
        }
      };

      this.owner.register(
        'component:parent-comp',
        setComponentTemplate(precompileTemplate('{{yield}}'), ParentCompComponent)
      );
      this.owner.register('component:child-comp', ChildCompComponent);

      this.render('{{#parent-comp}}{{child-comp}}{{/parent-comp}}');
    }
  }
);
