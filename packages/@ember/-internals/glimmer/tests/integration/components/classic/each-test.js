import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import { Component as EmberComponent } from '../../../utils/helpers';

moduleFor(
  'Syntax test: {{#each}} with native arrays (classic component)',
  class extends RenderingTestCase {
    makeList(items) {
      this.list = items;
    }

    replaceList(list) {
      runTask(() => set(this.context, 'list', list));
    }

    objectAt(idx) {
      return this.list[idx];
    }

    render(template, context = {}) {
      context.list = this.list;

      return super.render(template, context);
    }

    [`@test updating and setting within #each`]() {
      this.makeList([{ value: 1 }, { value: 2 }, { value: 3 }]);

      let FooBarComponent = class extends EmberComponent {
        init() {
          super.init(...arguments);
          this.isEven = true;
          this.tagName = 'li';
        }

        _isEven() {
          this.set('isEven', this.get('item.value') % 2 === 0);
        }

        didUpdate() {
          this._isEven();
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{#if this.isEven}}{{this.item.value}}{{/if}}'),
          FooBarComponent
        )
      );

      this.render(strip`
        {{#each this.list as |item|}}
          <li>Prev</li>
          {{foo-bar item=item}}
          <li>Next</li>
        {{/each}}
      `);

      this.assertText('Prev1NextPrev2NextPrev3Next');

      this.assertStableRerender();

      runTask(() => set(this.objectAt(0), 'value', 3));

      this.assertText('PrevNextPrev2NextPrev3Next');

      this.replaceList([{ value: 1 }, { value: 2 }, { value: 3 }]);

      this.assertText('Prev1NextPrev2NextPrev3Next');
    }
  }
);
