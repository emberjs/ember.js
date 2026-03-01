'use strict';

const MergeTrees = require('broccoli-merge-trees');
const createFile = require('broccoli-file-creator');
const path = require('path');
const Overrides = require('./overrides');
const SupportedBrowsers = require('./browsers');

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
  path.join(__dirname, '..', 'dist', 'packages', 'ember-template-compiler', 'index.js')
);

const { addonV1Shim } = require('@embroider/addon-shim');

const shim = addonV1Shim(path.join(__dirname, '..'), {
  autoImportCompat: {
    customizeMeta(meta) {
      return {
        ...meta,
        'implicit-modules': [
          './dist/packages/@ember/-internals/browser-environment/index.js',
          './dist/packages/@ember/-internals/container/index.js',
          './dist/packages/@ember/-internals/deprecations/index.js',
          './dist/packages/@ember/-internals/environment/index.js',
          './dist/packages/@ember/-internals/error-handling/index.js',
          './dist/packages/@ember/-internals/glimmer/index.js',
          './dist/packages/@ember/-internals/meta/index.js',
          './dist/packages/@ember/-internals/meta/lib/meta.js',
          './dist/packages/@ember/-internals/metal/index.js',
          './dist/packages/@ember/-internals/owner/index.js',
          './dist/packages/@ember/-internals/routing/index.js',
          './dist/packages/@ember/-internals/runtime/index.js',
          './dist/packages/@ember/-internals/runtime/lib/ext/rsvp.js',
          './dist/packages/@ember/-internals/runtime/lib/mixins/-proxy.js',
          './dist/packages/@ember/-internals/runtime/lib/mixins/comparable.js',
          './dist/packages/@ember/-internals/string/index.js',
          './dist/packages/@ember/-internals/utility-types/index.js',
          './dist/packages/@ember/-internals/utils/index.js',
          './dist/packages/@ember/-internals/views/index.js',
          './dist/packages/@ember/-internals/views/lib/compat/attrs.js',
          './dist/packages/@ember/-internals/views/lib/component_lookup.js',
          './dist/packages/@ember/-internals/views/lib/mixins/action_support.js',
          './dist/packages/@ember/-internals/views/lib/system/utils.js',
          './dist/packages/@ember/-internals/views/lib/views/core_view.js',
          './dist/packages/@ember/-internals/views/lib/views/states.js',
          './dist/packages/@ember/application/index.js',
          './dist/packages/@ember/application/instance.js',
          './dist/packages/@ember/application/lib/lazy_load.js',
          './dist/packages/@ember/application/namespace.js',
          './dist/packages/@ember/array/-internals.js',
          './dist/packages/@ember/array/index.js',
          './dist/packages/@ember/array/lib/make-array.js',
          './dist/packages/@ember/array/mutable.js',
          './dist/packages/@ember/array/proxy.js',
          './dist/packages/@ember/canary-features/index.js',
          './dist/packages/@ember/component/helper.js',
          './dist/packages/@ember/component/index.js',
          './dist/packages/@ember/component/template-only.js',
          './dist/packages/@ember/controller/index.js',
          './dist/packages/@ember/debug/index.js',
          './dist/packages/@ember/debug/lib/capture-render-tree.js',
          './dist/packages/@ember/debug/lib/deprecate.js',
          './dist/packages/@ember/debug/lib/handlers.js',
          './dist/packages/@ember/debug/lib/inspect.js',
          './dist/packages/@ember/debug/lib/testing.js',
          './dist/packages/@ember/debug/lib/warn.js',
          './dist/packages/@ember/debug/container-debug-adapter.js',
          './dist/packages/@ember/debug/data-adapter.js',
          './dist/packages/@ember/deprecated-features/index.js',
          './dist/packages/@ember/destroyable/index.js',
          './dist/packages/@ember/engine/index.js',
          './dist/packages/@ember/engine/instance.js',
          './dist/packages/@ember/engine/lib/engine-parent.js',
          './dist/packages/@ember/enumerable/index.js',
          './dist/packages/@ember/enumerable/mutable.js',
          './dist/packages/@ember/helper/index.js',
          './dist/packages/@ember/instrumentation/index.js',
          './dist/packages/@ember/modifier/index.js',
          './dist/packages/@ember/object/-internals.js',
          './dist/packages/@ember/object/compat.js',
          './dist/packages/@ember/object/computed.js',
          './dist/packages/@ember/object/core.js',
          './dist/packages/@ember/object/evented.js',
          './dist/packages/@ember/object/events.js',
          './dist/packages/@ember/object/index.js',
          './dist/packages/@ember/object/internals.js',
          './dist/packages/@ember/object/lib/computed/computed_macros.js',
          './dist/packages/@ember/object/lib/computed/reduce_computed_macros.js',
          './dist/packages/@ember/object/mixin.js',
          './dist/packages/@ember/object/observable.js',
          './dist/packages/@ember/object/observers.js',
          './dist/packages/@ember/object/promise-proxy-mixin.js',
          './dist/packages/@ember/object/proxy.js',
          './dist/packages/@ember/owner/index.js',
          './dist/packages/@ember/renderer/index.js',
          './dist/packages/@ember/routing/-internals.js',
          './dist/packages/@ember/routing/hash-location.js',
          './dist/packages/@ember/routing/history-location.js',
          './dist/packages/@ember/routing/index.js',
          './dist/packages/@ember/routing/lib/cache.js',
          './dist/packages/@ember/routing/lib/controller_for.js',
          './dist/packages/@ember/routing/lib/dsl.js',
          './dist/packages/@ember/routing/lib/generate_controller.js',
          './dist/packages/@ember/routing/lib/location-utils.js',
          './dist/packages/@ember/routing/lib/query_params.js',
          './dist/packages/@ember/routing/lib/router_state.js',
          './dist/packages/@ember/routing/lib/routing-service.js',
          './dist/packages/@ember/routing/lib/utils.js',
          './dist/packages/@ember/routing/none-location.js',
          './dist/packages/@ember/routing/route.js',
          './dist/packages/@ember/routing/router-service.js',
          './dist/packages/@ember/routing/router.js',
          './dist/packages/@ember/runloop/index.js',
          './dist/packages/@ember/service/index.js',
          './dist/packages/@ember/template-compilation/index.js',
          './dist/packages/@ember/template-factory/index.js',
          './dist/packages/@ember/template/index.js',
          './dist/packages/@ember/test/adapter.js',
          './dist/packages/@ember/test/index.js',
          './dist/packages/@ember/utils/index.js',
          './dist/packages/@ember/utils/lib/compare.js',
          './dist/packages/@ember/utils/lib/is-equal.js',
          './dist/packages/@ember/utils/lib/is_blank.js',
          './dist/packages/@ember/utils/lib/is_empty.js',
          './dist/packages/@ember/utils/lib/is_none.js',
          './dist/packages/@ember/utils/lib/is_present.js',
          './dist/packages/@ember/utils/lib/type-of.js',
          './dist/packages/@ember/version/index.js',
          './dist/packages/@glimmer/destroyable.js',
          './dist/packages/@glimmer/encoder.js',
          './dist/packages/@glimmer/env.js',
          './dist/packages/@glimmer/global-context.js',
          './dist/packages/@glimmer/manager.js',
          './dist/packages/@glimmer/node.js',
          './dist/packages/@glimmer/opcode-compiler.js',
          './dist/packages/@glimmer/owner.js',
          './dist/packages/@glimmer/program.js',
          './dist/packages/@glimmer/reference.js',
          './dist/packages/@glimmer/runtime.js',
          './dist/packages/@glimmer/tracking/index.js',
          './dist/packages/@glimmer/tracking/primitives/cache.js',
          './dist/packages/@glimmer/util.js',
          './dist/packages/@glimmer/validator.js',
          './dist/packages/@glimmer/vm.js',
          './dist/packages/@glimmer/wire-format.js',
          './dist/packages/@simple-dom/document.js',
          './dist/packages/backburner.js/index.js',
          './dist/packages/dag-map.js',
          './dist/packages/ember/index.js',
          './dist/packages/ember/version.js',
          './dist/packages/route-recognizer.js',
          './dist/packages/router_js.js',
          './dist/packages/rsvp.js',
        ],
        'implicit-test-modules': [
          './dist/packages/ember-testing/index.js',
          './dist/packages/ember-testing/lib/adapters/adapter.js',
          './dist/packages/ember-testing/lib/adapters/qunit.js',
          './dist/packages/ember-testing/lib/ext/application.js',
          './dist/packages/ember-testing/lib/ext/rsvp.js',
          './dist/packages/ember-testing/lib/helpers.js',
          './dist/packages/ember-testing/lib/helpers/and_then.js',
          './dist/packages/ember-testing/lib/helpers/current_path.js',
          './dist/packages/ember-testing/lib/helpers/current_route_name.js',
          './dist/packages/ember-testing/lib/helpers/current_url.js',
          './dist/packages/ember-testing/lib/helpers/pause_test.js',
          './dist/packages/ember-testing/lib/helpers/visit.js',
          './dist/packages/ember-testing/lib/helpers/wait.js',
          './dist/packages/ember-testing/lib/initializers.js',
          './dist/packages/ember-testing/lib/public-api.js',
          './dist/packages/ember-testing/lib/setup_for_testing.js',
          './dist/packages/ember-testing/lib/test.js',
          './dist/packages/ember-testing/lib/test/adapter.js',
          './dist/packages/ember-testing/lib/test/helpers.js',
          './dist/packages/ember-testing/lib/test/on_inject_helpers.js',
          './dist/packages/ember-testing/lib/test/pending_requests.js',
          './dist/packages/ember-testing/lib/test/promise.js',
          './dist/packages/ember-testing/lib/test/run.js',
          './dist/packages/ember-testing/lib/test/waiters.js',
        ],
      };
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

  treeForVendor() {
    // ember-cli always tries to append these to vendor.js, so even when we
    // don't want to put anything in them they need to exist as empty files.
    let vendorShims = new MergeTrees([
      createFile('ember/ember.js', ''),
      createFile('ember/ember.js.map', ''),
      createFile('ember/ember-testing.js', ''),
      createFile('ember/ember-testing.js.map', ''),
    ]);

    return vendorShims;
  },
};
