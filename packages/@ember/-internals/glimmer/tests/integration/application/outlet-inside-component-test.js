import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

import Component from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

// `{{outlet}}` used to be dynamically scoped: it rendered the current route's child
// template wherever it appeared, including inside a component that a route template
// renders. Apps use this for layout components that wrap the outlet.
moduleFor(
  'Application test: {{outlet}} inside a component',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      this.router.map(function () {
        this.route('child');
      });

      this.add('template:child', precompileTemplate('<p class="child">child content</p>'));
    }

    ['@test {{outlet}} in a template-only component renders the child route']() {
      this.add(
        'component:layout-wrapper',
        setComponentTemplate(
          precompileTemplate('<main class="wrapper">{{outlet}}</main>'),
          templateOnly()
        )
      );
      this.add('template:application', precompileTemplate('<LayoutWrapper />'));

      return this.visit('/child').then(() => {
        this.assertInnerHTML('<main class="wrapper"><p class="child">child content</p></main>');
      });
    }

    ['@test {{outlet}} in a classic component renders the child route']() {
      this.add(
        'component:layout-wrapper',
        setComponentTemplate(
          precompileTemplate('<main class="wrapper">{{outlet}}</main>'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.add('template:application', precompileTemplate('{{layout-wrapper}}'));

      return this.visit('/child').then(() => {
        this.assertInnerHTML('<main class="wrapper"><p class="child">child content</p></main>');
      });
    }
  }
);
