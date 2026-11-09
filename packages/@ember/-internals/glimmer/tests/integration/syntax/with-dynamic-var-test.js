import { moduleFor, RenderingTestCase, runTask, strip } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { Component } from '../../utils/helpers';
import { ClassicRenderingTestCase } from '../../utils/classic-rendering-test-case';

moduleFor(
  '{{-with-dynamic-var}}',
  class extends RenderingTestCase {
    ['@test allows setting/getting outletState']() {
      // this is simply asserting that we can write and read outletState
      // the actual value being used here is not what is used in real life
      // feel free to change the value being set and asserted as needed
      this.render(strip`
      {{#-with-dynamic-vars outletState="bar"}}
        {{-get-dynamic-var 'outletState'}}
      {{/-with-dynamic-vars}}
    `);

      this.assertText('bar');
    }
  }
);

moduleFor(
  '{{-with-dynamic-var}} (classic root)',
  class extends ClassicRenderingTestCase {
    ['@test allows setting/getting any variable']() {
      this.render(strip`
        {{#-with-dynamic-vars foo="bar"}}
          {{-get-dynamic-var 'foo'}}
        {{/-with-dynamic-vars}}
      `);

      this.assertText('bar');
    }

    ['@test an unset variable is undefined']() {
      this.render(`[{{-get-dynamic-var 'foo'}}]`);

      this.assertText('[]');
    }

    ['@test an inner block shadows a variable until the block ends']() {
      this.render(strip`
        {{#-with-dynamic-vars foo="outer"}}
          {{#-with-dynamic-vars foo="inner"}}
            {{-get-dynamic-var 'foo'}}
          {{/-with-dynamic-vars}}
          -{{-get-dynamic-var 'foo'}}
        {{/-with-dynamic-vars}}
      `);

      this.assertText('inner-outer');
    }

    ['@test a variable is visible inside a curly component, and its own variables stay inside']() {
      this.owner.register(
        'component:x-reader',
        setComponentTemplate(
          precompileTemplate(
            `{{-get-dynamic-var 'foo'}}{{#-with-dynamic-vars foo="from-component"}}:{{-get-dynamic-var 'foo'}}{{/-with-dynamic-vars}}`
          ),
          class extends Component {}
        )
      );

      this.render(strip`
        {{#-with-dynamic-vars foo="from-caller"}}
          <XReader />
          :{{-get-dynamic-var 'foo'}}
        {{/-with-dynamic-vars}}
      `);

      this.assertText('from-caller:from-component:from-caller');
    }

    ['@test names of DynamicScope members are plain variables']() {
      this.owner.register(
        'component:x-child',
        setComponentTemplate(precompileTemplate('child component'), class extends Component {})
      );

      this.render(strip`
        {{#-with-dynamic-vars view="v" child="c" get="g" set="s"}}
          {{-get-dynamic-var 'view'}}
          {{-get-dynamic-var 'child'}}
          {{-get-dynamic-var 'get'}}
          {{-get-dynamic-var 'set'}}
          <XChild />
        {{/-with-dynamic-vars}}
      `);

      this.assertText('vcgschild component');
    }

    ['@test a variable updates when its value changes']() {
      this.render(
        strip`
          {{#-with-dynamic-vars foo=this.value}}
            {{-get-dynamic-var 'foo'}}
          {{/-with-dynamic-vars}}
        `,
        { value: 'one' }
      );

      this.assertText('one');

      runTask(() => set(this.context, 'value', 'two'));
      this.assertText('two');
    }
  }
);
