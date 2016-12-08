import { Component } from '../../utils/helpers';
import { A as emberA } from 'ember-runtime';
import { set } from 'ember-metal';
import { strip } from '../../utils/abstract-test-case';

import { RenderingTest, moduleFor } from '../../utils/test-case';
import { IfUnlessWithSyntaxTest } from '../../utils/shared-conditional-tests';

moduleFor('Syntax test: {{#if}} with inverse', class extends IfUnlessWithSyntaxTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#if ${cond}}}${truthy}{{else}}${falsy}{{/if}}`;
  }

});

moduleFor('Syntax test: {{#unless}} with inverse', class extends IfUnlessWithSyntaxTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#unless ${cond}}}${falsy}{{else}}${truthy}{{/unless}}`;
  }

});

moduleFor('Syntax test: {{#if}} and {{#unless}} without inverse', class extends IfUnlessWithSyntaxTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#if ${cond}}}${truthy}{{/if}}{{#unless ${cond}}}${falsy}{{/unless}}`;
  }

});

moduleFor('Syntax test: {{#if}}', class extends RenderingTest {

  ['@test using `if` with an `{{each}}` destroys components when transitioning to and from inverse (GH #12267)'](assert) {
    let destroyedChildrenCount = 0;

    this.registerComponent('foo-bar', {
      template: '{{number}}',
      ComponentClass: Component.extend({
        willDestroy() {
          this._super();
          destroyedChildrenCount++;
        }
      })
    });

    this.render(strip`
      {{#if cond}}
        {{#each numbers as |number|}}
          {{foo-bar number=number}}
        {{/each}}
      {{else}}
        Nothing Here!
      {{/if}}`, { cond: true, numbers: emberA([1, 2, 3]) });

    this.assertText('123');

    this.runTask(() => this.rerender());

    this.assertText('123');

    this.runTask(() => set(this.context, 'cond', false));

    this.assertText('Nothing Here!');
    assert.equal(destroyedChildrenCount, 3, 'the children were properly destroyed');

    this.runTask(() => set(this.context, 'cond', true));

    this.assertText('123');
  }

  ['@test looking up `undefined` property defaults to false'](assert) {
    this.render(strip`
      {{#if foo.bar.baz}}
        Here!
      {{else}}
        Nothing Here!
      {{/if}}`, { foo: {} });

    this.assertText('Nothing Here!');

    this.runTask(() => this.rerender());

    this.assertText('Nothing Here!');

    this.runTask(() => set(this.context, 'foo', { bar: { baz: true } }));

    this.assertText('Here!');

    this.runTask(() => set(this.context, 'foo', {}));

    this.assertText('Nothing Here!');
  }

});
