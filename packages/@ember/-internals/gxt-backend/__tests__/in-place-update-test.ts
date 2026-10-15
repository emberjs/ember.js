/**
 * Updates rendered in place (compat, GXT_MODE).
 *
 * Glimmer semantics: an update re-evaluates the bindings whose inputs changed
 * and changes the DOM they render, in place:
 *
 * - a keyed `{{#each}}` whose new array has a new object for an existing key
 *   keeps the row and renders the new object's values;
 * - a block inside `<svg>` (`{{#if}}`) that renders again creates its elements
 *   in the SVG namespace, and a text child of an SVG element updates;
 * - a content mustache whose value is a component definition renders the
 *   component of the current value;
 * - an `{{#in-element}}` whose destination changes renders its block into the
 *   new destination and leaves the old one empty, and its content leaves the
 *   destination when its block is destroyed.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import templateOnly from '@ember/component/template-only';
import { setComponentTemplate } from '@glimmer/manager';
import { tracked } from '@glimmer/tracking';

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

    ['@test a content mustache renders the component its value is now']() {
      let Ok = setComponentTemplate(precompileTemplate('Ok'), templateOnly());
      let Ko = setComponentTemplate(precompileTemplate('Ko'), templateOnly());
      this.render('[{{if this.isOk this.Ok this.Ko}}]', { isOk: true, Ok, Ko });
      this.assertText('[Ok]');

      runTask(() => set(this.context, 'isOk', false));
      this.assertText('[Ko]');

      runTask(() => set(this.context, 'isOk', true));
      this.assertText('[Ok]');
    }

    ['@test an {{#in-element}} renders into its new destination when the destination changes']() {
      class State {
        @tracked destination: Element;
        @tracked label = 'one';
        constructor(destination: Element) {
          this.destination = destination;
        }
      }
      let first = document.createElement('div');
      let second = document.createElement('div');
      let state = new State(first);
      this.render('{{#in-element this.state.destination}}[{{this.state.label}}]{{/in-element}}', {
        state,
      });
      this.assert.strictEqual(first.textContent, '[one]');
      this.assert.strictEqual(second.textContent, '');

      runTask(() => (state.destination = second));
      this.assert.strictEqual(first.textContent, '', 'the old destination is empty');
      this.assert.strictEqual(second.textContent, '[one]', 'the block renders in the new one');

      runTask(() => (state.label = 'two'));
      this.assert.strictEqual(first.textContent, '');
      this.assert.strictEqual(second.textContent, '[two]', 'the moved block updates');

      runTask(() => (state.destination = first));
      this.assert.strictEqual(first.textContent, '[two]');
      this.assert.strictEqual(second.textContent, '');
    }

    ['@test an {{#in-element}} set to a new destination renders there once']() {
      let first = document.createElement('div');
      let second = document.createElement('div');
      this.render('{{#in-element this.destination}}[{{this.label}}]{{/in-element}}', {
        destination: first,
        label: 'one',
      });
      this.assert.strictEqual(first.textContent, '[one]');

      runTask(() => set(this.context, 'destination', second));
      this.assert.strictEqual(first.textContent, '', 'the old destination is empty');
      this.assert.strictEqual(second.textContent, '[one]', 'the block renders once in the new one');

      runTask(() => set(this.context, 'label', 'two'));
      this.assert.strictEqual(first.textContent, '');
      this.assert.strictEqual(second.textContent, '[two]');
    }

    ['@test the content of an {{#in-element}} leaves its destination with its block']() {
      class State {
        @tracked show = true;
      }
      let destination = document.createElement('div');
      let state = new State();
      this.render(
        '{{#if this.state.show}}{{#in-element this.destination}}[in]{{/in-element}}{{/if}}',
        { state, destination }
      );
      this.assert.strictEqual(destination.textContent, '[in]');

      runTask(() => (state.show = false));
      this.assert.strictEqual(destination.textContent, '', 'the block is gone');

      runTask(() => (state.show = true));
      this.assert.strictEqual(destination.textContent, '[in]', 'the block renders again');
    }
  }
);
