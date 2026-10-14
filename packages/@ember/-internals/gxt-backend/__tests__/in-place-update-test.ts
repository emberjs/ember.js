/**
 * Updates rendered in place (compat, GXT_MODE).
 *
 * Glimmer semantics: an update re-evaluates the bindings whose inputs changed
 * and changes the DOM they render, in place:
 *
 * - a keyed `{{#each}}` whose new array has a new object for an existing key
 *   keeps the row and renders the new object's values;
 * - a block inside `<svg>` (`{{#if}}`) that renders again creates its elements
 *   in the SVG namespace, and a text child of an SVG element updates.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

moduleFor(
  'GXT in-place updates',
  class extends RenderingTestCase {
    ['@test a keyed {{#each}} row renders the new object of its key']() {
      this.render(
        '{{#each this.people key="handle" as |p|}}<span>{{p.handle}}</span>-{{p.name}};{{/each}}',
        {
          people: [
            { handle: 'tomdale', name: 'Tom Dale' },
            { handle: 'wycats', name: 'Yehuda Katz' },
          ],
        }
      );
      this.assertText('tomdale-Tom Dale;wycats-Yehuda Katz;');
      let span = this.element.querySelector('span');

      runTask(() =>
        set(this.context, 'people', [
          { handle: 'tomdale', name: 'Thomas Dale' },
          { handle: 'wycats', name: 'Yehuda Katz' },
        ])
      );
      this.assertText('tomdale-Thomas Dale;wycats-Yehuda Katz;');
      this.assert.strictEqual(this.element.querySelector('span'), span, 'the row is kept');
    }

    ['@test an {{#if}} inside <svg> renders its branch in the SVG namespace again']() {
      this.render('<svg>{{#if this.show}}<circle />{{/if}}</svg>', { show: true });
      this.assert.strictEqual(this.element.querySelector('circle')?.namespaceURI, SVG_NAMESPACE);

      runTask(() => set(this.context, 'show', false));
      this.assert.strictEqual(this.element.querySelector('circle'), null);

      runTask(() => set(this.context, 'show', true));
      this.assert.strictEqual(
        this.element.querySelector('circle')?.namespaceURI,
        SVG_NAMESPACE,
        'the element of the branch rendered again is in the SVG namespace'
      );
    }

    ['@test a text child of an SVG element updates']() {
      this.render('<svg><text>{{this.label}}</text></svg>', { label: 'one' });
      this.assertText('one');

      runTask(() => set(this.context, 'label', 'two'));
      this.assertText('two');
    }
  }
);
