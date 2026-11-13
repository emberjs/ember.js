import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';

// A component's `{{#in-element}}` whose destination is an element of the
// template that renders the component (as in "Strict Mode :: Can use
// in-element"): the block renders into its own destination, whatever the
// rest of the template says.
moduleFor(
  'Syntax test: {{#in-element}} destinations in a component',
  class extends RenderingTestCase {
    '@test a commented-out {{#in-element}} does not change the destination of the next one'() {
      let getElement = (id) => document.getElementById(id);

      let Foo = setComponentTemplate(
        precompileTemplate(
          '{{!-- {{#in-element (getElement "elsewhere")}}x{{/in-element}} --}}{{#in-element (getElement "in-element-test")}}before{{/in-element}}after',
          { strictMode: true, scope: () => ({ getElement }) }
        ),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('[<div id="in-element-test" />][<Foo/>]');
      this.assertText('[before][after]');
      this.assertStableRerender();
    }

    '@test a destination id in single quotes'() {
      let getElement = (id) => document.getElementById(id);

      let Foo = setComponentTemplate(
        precompileTemplate(
          "{{#in-element (getElement 'in-element-test')}}before{{/in-element}}after",
          { strictMode: true, scope: () => ({ getElement }) }
        ),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('[<div id="in-element-test" />][<Foo/>]');
      this.assertText('[before][after]');
      this.assertStableRerender();
    }
  }
);
