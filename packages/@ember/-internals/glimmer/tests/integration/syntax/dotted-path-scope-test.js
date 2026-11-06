import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

import { template } from '@ember/template-compiler/runtime';
import Component from '@glimmer/component';

// In a loose-mode template, the head of a dotted tag (`<foo.bar />`) or of a
// dotted path in a mustache (`{{foo.bar}}`) must be in scope: a block param is,
// but only inside its block. An attribute value, a string or a comment holds no
// tag.
moduleFor(
  'Syntax test: the head of a dotted path',
  class extends RenderingTestCase {
    ['@test a dotted tag in an attribute value, a string or a comment is text']() {
      this.render(
        '<p title="<foo.bar x>">{{concat "<foo.bar x>"}}</p>{{!-- <foo.bar x> --}}<!-- <foo.bar x> -->'
      );

      this.assertText('<foo.bar x>');
      this.assert.strictEqual(this.element.querySelector('p').getAttribute('title'), '<foo.bar x>');
      this.assertStableRerender();
    }

    ['@test a dotted tag is checked whatever follows its name']() {
      for (let source of ['<foo.bar/>', '<foo.bar></foo.bar>']) {
        this.assert.throws(
          () => {
            template(source, { component: class extends Component {}, strictMode: false });
          },
          /You used foo.bar as a tag name, but foo is not in scope/,
          source
        );
      }
    }

    ['@test after the block of a block param, a dotted tag with its name is not in scope']() {
      this.assert.throws(() => {
        template('{{#let this.x as |foo|}}{{/let}}<foo.bar />', {
          component: class extends Component {},
          strictMode: false,
        });
      }, /You used foo.bar as a tag name, but foo is not in scope/);
    }

    ['@test after the block of a block param, a dotted path with its name is not in scope']() {
      this.assert.throws(() => {
        template('{{#let this.x as |foo|}}{{/let}}{{foo.bar}}', {
          component: class extends Component {},
          strictMode: false,
        });
      }, /You attempted to render a path \(`\{\{foo\.bar\}\}`\), but foo was not in scope/);
    }
  }
);
