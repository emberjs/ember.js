/**
 * A template's text is Glimmer's (compat, GXT_MODE).
 *
 * Glimmer parses a template with Handlebars' standalone-line and `~`
 * whitespace control, decodes HTML entities once, and keeps every text node
 * that parse produced, including whitespace between mustaches and elements:
 *
 * - `{{this.a}}⏎{{this.b}}` renders "a⏎b";
 * - a block opened or closed on a line of its own adds no newline;
 * - an entity in an attribute value is decoded (`title="a &amp; b"` is
 *   "a & b").
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'GXT template text',
  class extends RenderingTestCase {
    ['@test values on separate lines keep the whitespace between them']() {
      this.render('{{this.name}}\n  {{this.lastName}}', { name: 'Sergio', lastName: 'Arbeo' });
      this.assertText('Sergio\n  Arbeo');
    }

    ['@test elements on separate lines keep the newline between them']() {
      this.render('<p>a</p>\n<p>b</p>');
      let [first, second] = Array.from(this.element.querySelectorAll('p'));
      this.assert.strictEqual(first!.nextSibling!.nodeType, Node.TEXT_NODE);
      this.assert.strictEqual(first!.nextSibling!.textContent, '\n');
      this.assert.strictEqual(first!.nextSibling!.nextSibling, second);
    }

    ['@test a block on lines of its own adds no newline']() {
      this.render('<div>\n  {{#let this.v as |foo|}}\n    foo: "{{foo}}";\n  {{/let}}\n</div>', {
        v: 'V',
      });
      this.assert.strictEqual(this.element.querySelector('div')!.textContent, '\n    foo: "V";\n');
    }

    ['@test an entity in an attribute value is decoded']() {
      this.render('<div title="a &amp; b"></div>');
      this.assert.strictEqual(this.element.querySelector('div')!.getAttribute('title'), 'a & b');
    }
  }
);
