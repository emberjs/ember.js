/**
 * The references of a helper's or modifier's arguments are labelled with the
 * argument's path (compat, GXT_MODE, DEBUG).
 *
 * Glimmer labels a path reference with its path, and its built-ins name an
 * argument by that label: `{{on "click" h.missing}}` throws "You must pass a
 * function as the second argument to the `on` modifier; you passed undefined.
 * While rendering:⏎⏎h.missing". gxt passes a call site's argument paths with
 * its EMBER_ARG_LABELS compile flag.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { DEBUG } from '@glimmer/env';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'GXT argument labels',
  class extends RenderingTestCase {
    ['@test an {{on}} callback that is not a function is named by its block param path']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }
      this.assert.throws(() => {
        this.render(
          '{{#let this.handlers as |h|}}<button {{on "click" h.missing}}>x</button>{{/let}}',
          { handlers: {} }
        );
      }, /You must pass a function as the second argument to the `on` modifier; you passed undefined. While rendering:\n{2}h\.missing/u);
    }

    ['@test an {{on}} callback that is not a function is named by its this-path']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }
      this.assert.throws(() => {
        this.render('<button {{on "click" this.handlers.missing}}>x</button>', {
          handlers: {},
        });
      }, /you passed undefined. While rendering:\n{2}this\.handlers\.missing/u);
    }
  }
);
