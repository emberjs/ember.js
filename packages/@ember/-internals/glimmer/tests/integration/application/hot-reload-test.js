import { moduleFor, ApplicationTestCase, strip } from 'internal-test-helpers';

import { ENV } from '@ember/-internals/environment';
import Service, { inject as injectService } from '@ember/service';
import { Component, Helper } from '@ember/-internals/glimmer';
import { expect } from '@glimmer/util';

// This simuates what the template hot-reloading would do in development mode
// to avoid regressions

moduleFor(
  'Appliation test: template hot reloading',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this._APPLICATION_TEMPLATE_WRAPPER = ENV._APPLICATION_TEMPLATE_WRAPPER;
      this._TEMPLATE_ONLY_GLIMMER_COMPONENTS = ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS;

      ENV._APPLICATION_TEMPLATE_WRAPPER = false;
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = true;

      let didCreateReloader = reloader => {
        this.reloader = reloader;
      };

      this.add(
        'service:reloader',
        Service.extend({
          init() {
            this._super(...arguments);
            this.revisions = {};
            this.callbacks = [];

            didCreateReloader(this);
          },

          onReload(callback) {
            this.callbacks.push(callback);
          },

          revisionFor(name) {
            return this.revisions[name];
          },

          invalidate(name) {
            let revision = this.revisions[name];

            if (revision === undefined) {
              revision = 0;
            }

            this.revisions[name] = ++revision;

            this.callbacks.forEach(callback => callback());
          },
        })
      );

      this.add(
        'helper:hot-reload',
        Helper.extend({
          reloader: injectService(),

          init() {
            this._super(...arguments);
            this.reloader.onReload(() => this.recompute());
          },

          compute([name]) {
            let revision = this.reloader.revisionFor(name);

            if (revision === undefined) {
              return name;
            } else {
              return `${name}--hot-reload-${revision}`;
            }
          },
        })
      );
    }

    teardown() {
      super.teardown();
      ENV._APPLICATION_TEMPLATE_WRAPPER = this._APPLICATION_TEMPLATE_WRAPPER;
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = this._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
    }

    hotReload(name, template) {
      let reloader = expect(this.reloader);
      let revision = (reloader.revisionFor(name) || 0) + 1;
      let ComponentClass =
        this.applicationInstance.resolveRegistration(`component:${name}`) || null;

      this.addComponent(`${name}--hot-reload-${revision}`, {
        ComponentClass,
        template,
      });

      reloader.invalidate(name);
    }

    ['@test hot reloading template-only components']() {
      this.addTemplate(
        'application',
        strip`
          [{{component (hot-reload "x-foo") name="first"}}]
          [{{component (hot-reload "x-foo") name="second"}}]
          [{{component (hot-reload "x-bar")}}]
        `
      );

      this.addComponent('x-foo', {
        ComponentClass: null,
        template: 'x-foo: {{@name}}',
      });

      this.addComponent('x-bar', {
        ComponentClass: null,
        template: 'x-bar',
      });

      return this.visit('/').then(() => {
        this.assertInnerHTML(strip`
          [x-foo: first]
          [x-foo: second]
          [x-bar]
        `);

        this.runTask(() => {
          this.hotReload('x-foo', '<h1>{{@name}}</h1>');
        });

        this.assertInnerHTML(strip`
          [<h1>first</h1>]
          [<h1>second</h1>]
          [x-bar]
        `);

        this.runTask(() => {
          this.hotReload('x-bar', '<h2>wow</h2>');
        });

        this.assertInnerHTML(strip`
          [<h1>first</h1>]
          [<h1>second</h1>]
          [<h2>wow</h2>]
        `);

        this.runTask(() => {
          this.hotReload('x-foo', '<strong>x-foo</strong> <em>{{@name}}</em>');
        });

        this.assertInnerHTML(strip`
          [<strong>x-foo</strong> <em>first</em>]
          [<strong>x-foo</strong> <em>second</em>]
          [<h2>wow</h2>]
        `);

        this.runTask(() => {
          this.hotReload('x-foo', 'x-foo: {{@name}}');
          this.hotReload('x-bar', 'x-bar');
        });

        this.assertInnerHTML(strip`
          [x-foo: first]
          [x-foo: second]
          [x-bar]
        `);
      });
    }

    ['@test hot reloading class-based components']() {
      this.addTemplate(
        'application',
        strip`
          [{{component (hot-reload "x-foo") name="first"}}]
          [{{component (hot-reload "x-foo") name="second"}}]
          [{{component (hot-reload "x-bar")}}]
        `
      );

      let id = 0;

      this.addComponent('x-foo', {
        ComponentClass: Component.extend({
          tagName: '',
          init() {
            this._super(...arguments);
            this.set('id', id++);
          },
        }),
        template: 'x-foo: {{@name}} ({{this.id}})',
      });

      this.addComponent('x-bar', {
        ComponentClass: Component.extend({
          tagName: '',
          init() {
            this._super(...arguments);
            this.set('id', id++);
          },
        }),
        template: 'x-bar ({{this.id}})',
      });

      return this.visit('/').then(() => {
        this.assertInnerHTML(strip`
          [x-foo: first (0)]
          [x-foo: second (1)]
          [x-bar (2)]
        `);

        this.runTask(() => {
          this.hotReload('x-foo', '<h1>{{@name}} ({{this.id}})</h1>');
        });

        this.assertInnerHTML(strip`
          [<h1>first (3)</h1>]
          [<h1>second (4)</h1>]
          [x-bar (2)]
        `);

        this.runTask(() => {
          this.hotReload('x-bar', '<h2>wow ({{this.id}})</h2>');
        });

        this.assertInnerHTML(strip`
          [<h1>first (3)</h1>]
          [<h1>second (4)</h1>]
          [<h2>wow (5)</h2>]
        `);

        this.runTask(() => {
          this.hotReload('x-foo', '<strong>x-foo</strong> <em>{{@name}} ({{this.id}})</em>');
        });

        this.assertInnerHTML(strip`
          [<strong>x-foo</strong> <em>first (6)</em>]
          [<strong>x-foo</strong> <em>second (7)</em>]
          [<h2>wow (5)</h2>]
        `);

        this.runTask(() => {
          this.hotReload('x-foo', 'x-foo: {{@name}} ({{this.id}})');
          this.hotReload('x-bar', 'x-bar ({{this.id}})');
        });

        this.assertInnerHTML(strip`
          [x-foo: first (8)]
          [x-foo: second (9)]
          [x-bar (10)]
        `);
      });
    }
  }
);
