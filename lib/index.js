'use strict';

const MergeTrees = require('broccoli-merge-trees');
const createFile = require('broccoli-file-creator');
const Funnel = require('broccoli-funnel');
const path = require('path');
const Overrides = require('./overrides');
const SupportedBrowsers = require('./browsers');
const fs = require('fs');

const isProduction = process.env.EMBER_ENV === 'production';

const useEmberModules = (() => {
  // this doesn't go through the documented API of the @ember/optional-features
  // package because that is available way too late for this.
  let pkg = require(path.join(process.cwd(), 'package.json'));
  let configDir = pkg['ember-addon']?.['configPath'] ?? 'config';
  let optionalFeaturesPath = `./${configDir}/optional-features.json`;
  if (fs.existsSync(optionalFeaturesPath)) {
    return require(path.join(process.cwd(), optionalFeaturesPath))?.['use-ember-modules'] ?? false;
  } else {
    return false;
  }
})();

const paths = {};
const absolutePaths = {};

function add(paths, name, path) {
  Object.defineProperty(paths, name, {
    configurable: false,
    get: function () {
      return path;
    },
  });
}

add(paths, 'prod', 'vendor/ember/ember.js');
add(paths, 'debug', 'vendor/ember/ember.js');
add(paths, 'testing', 'vendor/ember/ember-testing.js');

add(
  absolutePaths,
  'templateCompiler',
  useEmberModules
    ? path.join(
        __dirname,
        '..',
        'dist',
        isProduction ? 'prod' : 'dev',
        'packages',
        'ember-template-compiler',
        'index.js'
      )
    : path.join(__dirname, '..', 'dist', 'ember-template-compiler.js')
);

const { addonV1Shim } = require('@embroider/addon-shim');

const shim = addonV1Shim(path.join(__dirname, '..'), {
  autoImportCompat: {
    customizeMeta(meta) {
      /* This whole hook is an ember-auto-import feature that only effects classic builds, not embroider builds. */

      if (useEmberModules) {
        // this is our forward-compatible mode where all of ember-source is
        // handled by ember-auto-import, like a normal v2 addon.
        //
        // In this case, we need to inject an implicit-modules config to force
        // all the traditionally-included modules to be included whether or not
        // we see an import for them, because ember-auto-import does not have
        // global visiblity of all imports in all v1 addons.
        //
        // This means ember-source is not tree-shakable on classic builds, but
        // that's the normal status quo for classic builds. It's all
        // tree-shakable on the current default build (@embroider/vite).
        return {
          ...meta,
          'implicit-modules': [
            './dist/dev/packages/@ember/-internals/browser-environment/index.js',
            './dist/dev/packages/@ember/-internals/container/index.js',
            './dist/dev/packages/@ember/-internals/deprecations/index.js',
            './dist/dev/packages/@ember/-internals/environment/index.js',
            './dist/dev/packages/@ember/-internals/error-handling/index.js',
            './dist/dev/packages/@ember/-internals/glimmer/index.js',
            './dist/dev/packages/@ember/-internals/meta/index.js',
            './dist/dev/packages/@ember/-internals/meta/lib/meta.js',
            './dist/dev/packages/@ember/-internals/metal/index.js',
            './dist/dev/packages/@ember/-internals/owner/index.js',
            './dist/dev/packages/@ember/-internals/routing/index.js',
            './dist/dev/packages/@ember/-internals/runtime/index.js',
            './dist/dev/packages/@ember/-internals/runtime/lib/ext/rsvp.js',
            './dist/dev/packages/@ember/-internals/runtime/lib/mixins/-proxy.js',
            './dist/dev/packages/@ember/-internals/runtime/lib/mixins/comparable.js',
            './dist/dev/packages/@ember/-internals/string/index.js',
            './dist/dev/packages/@ember/-internals/utility-types/index.js',
            './dist/dev/packages/@ember/-internals/utils/index.js',
            './dist/dev/packages/@ember/-internals/views/index.js',
            './dist/dev/packages/@ember/-internals/views/lib/compat/attrs.js',
            './dist/dev/packages/@ember/-internals/views/lib/component_lookup.js',
            './dist/dev/packages/@ember/-internals/views/lib/mixins/action_support.js',
            './dist/dev/packages/@ember/-internals/views/lib/system/utils.js',
            './dist/dev/packages/@ember/-internals/views/lib/views/core_view.js',
            './dist/dev/packages/@ember/-internals/views/lib/views/states.js',
            './dist/dev/packages/@ember/application/index.js',
            './dist/dev/packages/@ember/application/instance.js',
            './dist/dev/packages/@ember/application/lib/lazy_load.js',
            './dist/dev/packages/@ember/application/namespace.js',
            './dist/dev/packages/@ember/array/-internals.js',
            './dist/dev/packages/@ember/array/index.js',
            './dist/dev/packages/@ember/array/lib/make-array.js',
            './dist/dev/packages/@ember/array/mutable.js',
            './dist/dev/packages/@ember/array/proxy.js',
            './dist/dev/packages/@ember/canary-features/index.js',
            './dist/dev/packages/@ember/component/helper.js',
            './dist/dev/packages/@ember/component/index.js',
            './dist/dev/packages/@ember/component/template-only.js',
            './dist/dev/packages/@ember/controller/index.js',
            './dist/dev/packages/@ember/debug/index.js',
            './dist/dev/packages/@ember/debug/lib/capture-render-tree.js',
            './dist/dev/packages/@ember/debug/lib/deprecate.js',
            './dist/dev/packages/@ember/debug/lib/handlers.js',
            './dist/dev/packages/@ember/debug/lib/inspect.js',
            './dist/dev/packages/@ember/debug/lib/testing.js',
            './dist/dev/packages/@ember/debug/lib/warn.js',
            './dist/dev/packages/@ember/debug/container-debug-adapter.js',
            './dist/dev/packages/@ember/debug/data-adapter.js',
            './dist/dev/packages/@ember/deprecated-features/index.js',
            './dist/dev/packages/@ember/destroyable/index.js',
            './dist/dev/packages/@ember/engine/index.js',
            './dist/dev/packages/@ember/engine/instance.js',
            './dist/dev/packages/@ember/engine/lib/engine-parent.js',
            './dist/dev/packages/@ember/enumerable/index.js',
            './dist/dev/packages/@ember/enumerable/mutable.js',
            './dist/dev/packages/@ember/helper/index.js',
            './dist/dev/packages/@ember/instrumentation/index.js',
            './dist/dev/packages/@ember/modifier/index.js',
            './dist/dev/packages/@ember/object/-internals.js',
            './dist/dev/packages/@ember/object/compat.js',
            './dist/dev/packages/@ember/object/computed.js',
            './dist/dev/packages/@ember/object/core.js',
            './dist/dev/packages/@ember/object/evented.js',
            './dist/dev/packages/@ember/object/events.js',
            './dist/dev/packages/@ember/object/index.js',
            './dist/dev/packages/@ember/object/internals.js',
            './dist/dev/packages/@ember/object/lib/computed/computed_macros.js',
            './dist/dev/packages/@ember/object/lib/computed/reduce_computed_macros.js',
            './dist/dev/packages/@ember/object/mixin.js',
            './dist/dev/packages/@ember/object/observable.js',
            './dist/dev/packages/@ember/object/observers.js',
            './dist/dev/packages/@ember/object/promise-proxy-mixin.js',
            './dist/dev/packages/@ember/object/proxy.js',
            './dist/dev/packages/@ember/owner/index.js',
            './dist/dev/packages/@ember/renderer/index.js',
            './dist/dev/packages/@ember/routing/-internals.js',
            './dist/dev/packages/@ember/routing/hash-location.js',
            './dist/dev/packages/@ember/routing/history-location.js',
            './dist/dev/packages/@ember/routing/index.js',
            './dist/dev/packages/@ember/routing/lib/cache.js',
            './dist/dev/packages/@ember/routing/lib/controller_for.js',
            './dist/dev/packages/@ember/routing/lib/dsl.js',
            './dist/dev/packages/@ember/routing/lib/generate_controller.js',
            './dist/dev/packages/@ember/routing/lib/location-utils.js',
            './dist/dev/packages/@ember/routing/lib/query_params.js',
            './dist/dev/packages/@ember/routing/lib/router_state.js',
            './dist/dev/packages/@ember/routing/lib/routing-service.js',
            './dist/dev/packages/@ember/routing/lib/utils.js',
            './dist/dev/packages/@ember/routing/none-location.js',
            './dist/dev/packages/@ember/routing/route.js',
            './dist/dev/packages/@ember/routing/router-service.js',
            './dist/dev/packages/@ember/routing/router.js',
            './dist/dev/packages/@ember/runloop/index.js',
            './dist/dev/packages/@ember/service/index.js',
            './dist/dev/packages/@ember/template-compilation/index.js',
            './dist/dev/packages/@ember/template-factory/index.js',
            './dist/dev/packages/@ember/template/index.js',
            './dist/dev/packages/@ember/test/adapter.js',
            './dist/dev/packages/@ember/test/index.js',
            './dist/dev/packages/@ember/utils/index.js',
            './dist/dev/packages/@ember/utils/lib/compare.js',
            './dist/dev/packages/@ember/utils/lib/is-equal.js',
            './dist/dev/packages/@ember/utils/lib/is_blank.js',
            './dist/dev/packages/@ember/utils/lib/is_empty.js',
            './dist/dev/packages/@ember/utils/lib/is_none.js',
            './dist/dev/packages/@ember/utils/lib/is_present.js',
            './dist/dev/packages/@ember/utils/lib/type-of.js',
            './dist/dev/packages/@ember/version/index.js',
            './dist/dev/packages/@glimmer/destroyable/index.js',
            './dist/dev/packages/@glimmer/encoder/index.js',
            './dist/dev/packages/@glimmer/env/index.js',
            './dist/dev/packages/@glimmer/global-context/index.js',
            './dist/dev/packages/@glimmer/manager/index.js',
            './dist/dev/packages/@glimmer/node/index.js',
            './dist/dev/packages/@glimmer/opcode-compiler/index.js',
            './dist/dev/packages/@glimmer/owner/index.js',
            './dist/dev/packages/@glimmer/program/index.js',
            './dist/dev/packages/@glimmer/reference/index.js',
            './dist/dev/packages/@glimmer/runtime/index.js',
            './dist/dev/packages/@glimmer/tracking/index.js',
            './dist/dev/packages/@glimmer/tracking/primitives/cache/index.js',
            './dist/dev/packages/@glimmer/util/index.js',
            './dist/dev/packages/@glimmer/validator/index.js',
            './dist/dev/packages/@glimmer/vm/index.js',
            './dist/dev/packages/@glimmer/wire-format/index.js',
            './dist/dev/packages/@simple-dom/document/index.js',
            './dist/dev/packages/backburner.js/index.js',
            './dist/dev/packages/dag-map/index.js',
            './dist/dev/packages/ember/index.js',
            './dist/dev/packages/ember/version.js',
            './dist/dev/packages/route-recognizer/index.js',
            './dist/dev/packages/router_js/index.js',
            './dist/dev/packages/rsvp/index.js',
          ].map((x) => (isProduction ? x.replace('/dist/dev/', '/dist/prod/') : x)),
          'implicit-test-modules': [
            './dist/dev/packages/ember-testing/index.js',
            './dist/dev/packages/ember-testing/lib/adapters/adapter.js',
            './dist/dev/packages/ember-testing/lib/ext/application.js',
            './dist/dev/packages/ember-testing/lib/ext/rsvp.js',
            './dist/dev/packages/ember-testing/lib/public-api.js',
            './dist/dev/packages/ember-testing/lib/test.js',
            './dist/dev/packages/ember-testing/lib/test/adapter.js',
            './dist/dev/packages/ember-testing/lib/test/pending_requests.js',
            './dist/dev/packages/ember-testing/lib/test/promise.js',
            './dist/dev/packages/ember-testing/lib/test/run.js',
            './dist/dev/packages/ember-testing/lib/test/waiters.js',
          ].map((x) => (isProduction ? x.replace('/dist/dev/', '/dist/prod/') : x)),
        };
      } else {
        // this is our backward-compatible mode that actually keeps most of ember-source in vendor.js.
        return { ...meta, 'renamed-modules': {} };
      }
    },
  },
});

module.exports = {
  ...shim,
  paths,
  absolutePaths,

  init() {
    if (shim.init) {
      shim.init.apply(this, arguments);
    } else {
      this._super.init && this._super.init.apply(this, arguments);
    }

    // resets `this.root` to the correct location by default ember-cli
    // considers `__dirname` here to be the root, but since our main entry
    // point is within a subfolder we need to correct that
    this.root = path.join(__dirname, '..');

    // Updates the vendor tree to point to dist, so we get the correct tree in
    // treeForVendor
    this.treePaths.vendor = 'dist';
  },

  _overrideTree: undefined,

  // Expose supported list of browsers for reference by other packages
  supportedBrowsers: SupportedBrowsers,

  included() {
    if (shim.included) {
      // this is what actually uses our autoImportCompat closure
      shim.included.apply(this, arguments);
    } else {
      this._super.included.apply(this, arguments);
    }

    let overrides = Overrides.for(this.project);

    if (overrides.hasOverrides) {
      this._overrideTree = overrides.toTree();
    }

    if (overrides.hasBuildTimeWarning) {
      this.ui.writeWarnLine('[DEPRECATION] ' + overrides.buildTimeWarning);
    }
  },

  treeForVendor(tree) {
    if (shim.treeForVendor) {
      tree = shim.treeForVendor.call(this, tree);
    }
    const isProduction = process.env.EMBER_ENV === 'production';

    let templateCompiler = new Funnel(tree, {
      destDir: 'ember',
      include: ['ember-template-compiler.js', 'ember-template-compiler.js.map'],
    });

    let emberAMDBundles;

    if (useEmberModules) {
      // ember-cli always tries to append these to vendor.js, so even when we
      // don't want to put anything in them they need to exist as empty files.
      emberAMDBundles = new MergeTrees([
        createFile('ember/ember.js', ''),
        createFile('ember/ember.js.map', ''),
        createFile('ember/ember-testing.js', ''),
        createFile('ember/ember-testing.js.map', ''),
      ]);
    } else {
      let which = isProduction ? 'prod' : 'debug';

      emberAMDBundles = new Funnel(tree, {
        destDir: 'ember',
        include: [
          `ember.${which}.js`,
          `ember.${which}.js.map`,
          'ember-testing.js',
          'ember-testing.js.map',
        ],
        getDestinationPath(path) {
          return path.replace(`ember.${which}.`, 'ember.');
        },
      });
    }

    let emberCliBabel = this.addons.find((a) => a.name === 'ember-cli-babel');

    // this is primarily so we get preset-env with the app's targets. All our
    // special stuff was already accounted for in the building of the bundles.
    return emberCliBabel.transpileTree(new MergeTrees([emberAMDBundles, templateCompiler]), {
      'ember-cli-babel': {
        compileModules: false,
        disableDebugTooling: true,
        disableEmberModulesAPIPolyfill: true,
      },
    });
  },
};
