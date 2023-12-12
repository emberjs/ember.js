import { Promise } from 'rsvp';
import Application from '@ember/application';
import { run, _hasScheduledTimers, _getCurrentRunLoop } from '@ember/runloop';
import { compile } from 'ember-template-compiler';
import { ModuleBasedTestResolver } from 'internal-test-helpers';

const { module, test } = QUnit;

/*
  This test file is intended to emulate what @ember/test-helpers does, and
  should be considered a "smoke test" of when a given change will break
  existing versions of @ember/test-helpers.

  This generally means that we will have to represent multiple versions of
  `@ember/test-helpers` here (will make a nested module for each significant
  revision).
*/
module('@ember/test-helpers emulation test', function () {
  module('v1.6.1', function () {
    let EMPTY_TEMPLATE = compile('');

    function lookupTemplate(owner, templateFullName) {
      let template = owner.lookup(templateFullName);
      if (typeof template === 'function') return template(owner);
      return template;
    }

    function settled() {
      return new Promise(function (resolve) {
        let watcher = setInterval(() => {
          if (_getCurrentRunLoop() || _hasScheduledTimers()) {
            return;
          }

          // Stop polling
          clearInterval(watcher);

          // Synchronously resolve the promise
          run(null, resolve);
        }, 10);
      });
    }

    async function setupContext(context) {
      // condensed version of https://github.com/emberjs/ember-test-helpers/blob/v1.6.0/addon-test-support/%40ember/test-helpers/build-owner.ts#L38
      // without support for "custom resolver"
      await context.application.boot();

      context.owner = await context.application.buildInstance().boot();
    }

    function setupRenderingContext(context) {
      let { owner } = context;
      let OutletView = owner.factoryFor('view:-outlet');
      let environment = owner.lookup('-environment:main');
      let outletTemplateFactory = owner.lookup('template:-outlet');
      let toplevelView = OutletView.create({ environment, template: outletTemplateFactory });

      owner.register('-top-level-view:main', {
        create() {
          return toplevelView;
        },
      });

      // initially render a simple empty template
      return render(EMPTY_TEMPLATE, context).then(() => {
        let rootElement = document.querySelector(owner.rootElement);
        run(toplevelView, 'appendTo', rootElement);

        context.element = rootElement;

        return settled();
      });
    }

    let templateId = 0;
    function render(template, context) {
      let { owner } = context;
      let toplevelView = owner.lookup('-top-level-view:main');
      let OutletTemplate = lookupTemplate(owner, 'template:-outlet');
      templateId += 1;
      let templateFullName = `template:-undertest-${templateId}`;
      owner.register(templateFullName, template);

      let outletState = {
        render: {
          owner,
          into: undefined,
          outlet: 'main',
          name: 'application',
          controller: undefined,
          ViewClass: undefined,
          template: OutletTemplate,
        },

        outlets: {
          main: {
            render: {
              owner,
              into: undefined,
              outlet: 'main',
              name: 'index',
              controller: context,
              ViewClass: undefined,
              template: lookupTemplate(owner, templateFullName),
              outlets: {},
            },
            outlets: {},
          },
        },
      };
      toplevelView.setOutletState(outletState);

      return settled();
    }

    module('setupRenderingContext', function (hooks) {
      hooks.beforeEach(async function () {
        this.application = Application.create({
          rootElement: '#qunit-fixture',
          autoboot: false,
          Resolver: ModuleBasedTestResolver,
        });

        await setupContext(this);
        await setupRenderingContext(this);
      });

      hooks.afterEach(function () {
        run(this.owner, 'destroy');
        run(this.application, 'destroy');
      });

      test('it basically works', async function (assert) {
        await render(compile('Hi!'), this);

        assert.equal(this.element.textContent, 'Hi!');
      });
    });
  });

  module('v1.6.0', function () {
    let EMPTY_TEMPLATE = compile('');

    function settled() {
      return new Promise(function (resolve) {
        let watcher = setInterval(() => {
          if (_getCurrentRunLoop() || _hasScheduledTimers()) {
            return;
          }

          // Stop polling
          clearInterval(watcher);

          // Synchronously resolve the promise
          run(null, resolve);
        }, 10);
      });
    }

    async function setupContext(context) {
      // condensed version of https://github.com/emberjs/ember-test-helpers/blob/v1.6.0/addon-test-support/%40ember/test-helpers/build-owner.ts#L38
      // without support for "custom resolver"
      await context.application.boot();

      context.owner = await context.application.buildInstance().boot();
    }

    function setupRenderingContext(context) {
      let { owner } = context;
      let OutletView = owner.factoryFor('view:-outlet');
      let environment = owner.lookup('-environment:main');
      let outletTemplateFactory = owner.lookup('template:-outlet');
      let toplevelView = OutletView.create({ environment, template: outletTemplateFactory });

      owner.register('-top-level-view:main', {
        create() {
          return toplevelView;
        },
      });

      // initially render a simple empty template
      return render(EMPTY_TEMPLATE, context).then(() => {
        let rootElement = document.querySelector(owner.rootElement);
        run(toplevelView, 'appendTo', rootElement);

        context.element = rootElement;

        return settled();
      });
    }

    let templateId = 0;
    function render(template, context) {
      let { owner } = context;
      let toplevelView = owner.lookup('-top-level-view:main');
      templateId += 1;
      let templateFullName = `template:-undertest-${templateId}`;
      owner.register(templateFullName, template);

      let outletState = {
        render: {
          owner,
          into: undefined,
          outlet: 'main',
          name: 'application',
          controller: undefined,
          ViewClass: undefined,
          template: owner.lookup('template:-outlet'),
        },

        outlets: {
          main: {
            render: {
              owner,
              into: undefined,
              outlet: 'main',
              name: 'index',
              controller: context,
              ViewClass: undefined,
              template: owner.lookup(templateFullName),
              outlets: {},
            },
            outlets: {},
          },
        },
      };
      toplevelView.setOutletState(outletState);

      return settled();
    }

    module('setupRenderingContext', function (hooks) {
      hooks.beforeEach(async function () {
        expectDeprecation(
          /The `template` property of `OutletState` should be a `Template` rather than a `TemplateFactory`/
        );

        this.application = Application.create({
          rootElement: '#qunit-fixture',
          autoboot: false,
          Resolver: ModuleBasedTestResolver,
        });

        await setupContext(this);
        await setupRenderingContext(this);
      });

      hooks.afterEach(function () {
        run(this.owner, 'destroy');
        run(this.application, 'destroy');
      });

      test('it basically works', async function (assert) {
        await render(compile('Hi!'), this);

        assert.equal(this.element.textContent, 'Hi!');
      });
    });
  });
});
