/**
 * The DOM of `{{#each}}` rows (compat, GXT_MODE).
 *
 * Glimmer semantics: a row's DOM is the bounds of its block, and a component
 * the row renders is part of them. When the list changes, the rows of the
 * removed items are removed with everything they render, wherever the
 * `{{#each}}` is (at the template's root or in an element) and whatever the
 * row is (a component alone, or a component among other content).
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import Component from '@glimmer/component';

moduleFor(
  'GXT {{#each}} rows',
  class extends RenderingTestCase {
    ['@test the rows of a root-level {{#each}} of components follow the list']() {
      this.owner.register(
        'component:row-item',
        setComponentTemplate(precompileTemplate('({{@id}})'), class extends Component {})
      );

      this.render('{{#each this.list as |id|}}{{row-item id=id}}{{/each}}', {
        list: ['a', 'b', 'c'],
      });
      this.assertText('(a)(b)(c)');

      runTask(() => set(this.context, 'list', ['a']));
      this.assertText('(a)');

      runTask(() => set(this.context, 'list', ['c', 'a', 'd']));
      this.assertText('(c)(a)(d)');

      runTask(() => set(this.context, 'list', ['d']));
      this.assertText('(d)');

      runTask(() => set(this.context, 'list', []));
      this.assertText('');
    }

    ['@test the rows of an {{#each}} of components in an element follow the list']() {
      this.owner.register(
        'component:row-item',
        setComponentTemplate(precompileTemplate('({{@id}})'), class extends Component {})
      );

      this.render('<p>{{#each this.list as |item|}}{{row-item id=item}}{{/each}}</p>', {
        list: ['a', 'b', 'c'],
      });
      this.assertText('(a)(b)(c)');

      runTask(() => set(this.context, 'list', ['b']));
      this.assertText('(b)');
    }

    ['@test a row that renders a component among other content leaves with all of it']() {
      this.owner.register(
        'component:row-label',
        setComponentTemplate(precompileTemplate('{{@id}}.'), templateOnly())
      );

      this.render('<p>{{#each this.list as |item|}}[{{row-label id=item}}]{{/each}}</p>', {
        list: ['a', 'b', 'c'],
      });
      this.assertText('[a.][b.][c.]');

      runTask(() => set(this.context, 'list', ['c', 'a']));
      this.assertText('[c.][a.]');

      runTask(() => set(this.context, 'list', ['a']));
      this.assertText('[a.]');
    }
  }
);
