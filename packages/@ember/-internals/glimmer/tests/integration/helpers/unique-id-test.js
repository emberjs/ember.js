import { RenderingTestCase, strip, moduleFor, runTask } from 'internal-test-helpers';
import { setProperties } from '@ember/-internals/metal';
import { EMBER_UNIQUE_ID_HELPER } from '@ember/canary-features';

if (EMBER_UNIQUE_ID_HELPER) {
  moduleFor(
    'Helpers test: {{unique-id}}',
    class extends RenderingTestCase {
      ['@test it generates a unique id (string) each time']() {
        let { first, second } = this.render(`<p>{{unique-id}}</p><p>{{unique-id}}</p>`, () => {
          let first = this.asElement(this.firstChild);
          let second = this.asElement(this.nthChild(1));

          return {
            first: this.asTextContent(first.firstChild),
            second: this.asTextContent(second.firstChild),
          };
        });

        this.assert.notStrictEqual(
          first,
          second,
          `different invocations of {{unique-id}} should produce different values`
        );
      }

      [`@test when unique-id is used with #let, it remains stable when it's used`]() {
        let { first, second } = this.render(
          strip`
          {{#let (unique-id) as |id|}}
            <p>{{id}}</p><p>{{id}}</p>
          {{/let}}
        `,
          () => {
            let first = this.asElement(this.firstChild);
            let second = this.asElement(this.nthChild(1));

            return {
              first: this.asTextContent(first.firstChild),
              second: this.asTextContent(second.firstChild),
            };
          }
        );

        this.assert.strictEqual(
          first,
          second,
          `when unique-id is used as a variable, it remains the same`
        );
      }

      [`@test unique-id doesn't change if it's concatenated with a value that does change`]() {
        class Elements {
          constructor(label, input, assert) {
            this.label = label;
            this.input = input;
            this.assert = assert;
          }

          id(regex) {
            let forAttr = this.label.getAttribute('for');

            this.assert.strictEqual(
              forAttr,
              this.input.getAttribute('id'),
              `the label's 'for' attribute should be the same as the input's 'id' attribute`
            );

            let match = forAttr.match(regex);

            this.assert.ok(match, 'the id starts with the prefix');

            return match[1];
          }
        }

        let { elements, id } = this.render(
          strip`
            {{#let (unique-id) as |id|}}
              <label for="{{this.prefix}}-{{id}}">Enable Feature</label>
              <input id="{{this.prefix}}-{{id}}" type="checkbox">
            {{/let}}`,
          { prefix: 'app' },
          () => {
            let label = this.asElement(this.firstChild, 'label');
            let input = this.asElement(this.nthChild(1), 'input');

            let elements = new Elements(label, input, this.assert);

            return { elements, id: elements.id(/^app-(.*)$/) };
          }
        );

        this.update({ prefix: 'melanie' }, () => {
          let newId = elements.id(/^melanie-(.*)$/);

          this.assert.strictEqual(
            id,
            newId,
            `the unique-id part of a concatenated attribute shouldn't change just because a dynamic part of it changed`
          );
        });
      }

      render(template, ...rest) {
        // If there are three parameters to `render`, the second parameter is the
        // template's arguments.
        let args = rest.length === 2 ? rest[0] : {};
        // If there are two parameters to `render`, the second parameter is the
        // postcondition. Otherwise, the third parameter is the postcondition.
        let postcondition = rest.length === 2 ? rest[1] : rest[0];

        super.render(template, args);
        let result = postcondition();
        this.assertStableRerender();
        return result;
      }

      update(args, postcondition) {
        runTask(() => setProperties(this.context, args));
        postcondition();
        this.assertStableRerender();
      }

      asElement(node, tag) {
        this.assert.ok(node !== null && node.nodeType === 1);

        if (tag) {
          this.assert.strictEqual(node.tagName.toLowerCase(), tag, `Element is <${tag}>`);
        }

        return node;
      }

      asTextNode(node) {
        this.assert.ok(node !== null && node.nodeType === 3);
        return node;
      }

      asTextContent(node) {
        let data = this.asTextNode(node).data;
        this.assert.ok(data.trim().length > 0, `The text node has content`);
        return data;
      }
    }
  );
}
