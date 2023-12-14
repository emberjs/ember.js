/**
  *Provides **stable** type definitions for Ember.js.*

  This module is generated automatically as part of Ember's publishing process and
  should never be edited manually.

  To use these type definitions, add this import to any TypeScript file in your
  Ember app or addon:

  ```ts
  import 'ember-source/types';
  import 'ember-source/types/preview';
  ```

  @module
 */

// This works because each of these modules presents `declare module` definition
// of the module and *only* that, so importing this file in turn makes those
// module declarations "visible" automatically throughout a consuming project.
// Combined with use of `typesVersions` (or, in the future, possibly `exports`)
// in `package.json`, this allows users to import the types without knowing the
// exact layout details.
//
// Somewhat annoyingly, every single module in the graph must appear here. For
// now, while we are publishing ambient types, that means we must maintain this
// by hand. When we start emitting types from the source, we will need to do the
// same work, but automatically.

// STATUS NOTE: this does not yet include Ember's full public API, only the
// subset of it for which we have determined the types are ready to stabilize.
//
// Over time, it will come to include *all* of Ember's types, and the matching
// `preview` types will become empty. This is means that someone who writes the
// import we recommend--
//
// ```ts
// import 'ember-source/types';
// import 'ember-source/types/preview';
// ```
//
// --will always get the most up-to-date mix of preview and stable types, with
// no extra effort required.

/// <reference path="./@ember/-internals/browser-environment/index.d.ts" />
/// <reference path="./@ember/-internals/browser-environment/lib/has-dom.d.ts" />
/// <reference path="./@ember/-internals/container/index.d.ts" />
/// <reference path="./@ember/-internals/container/lib/container.d.ts" />
/// <reference path="./@ember/-internals/container/lib/registry.d.ts" />
/// <reference path="./@ember/-internals/environment/index.d.ts" />
/// <reference path="./@ember/-internals/environment/lib/context.d.ts" />
/// <reference path="./@ember/-internals/environment/lib/env.d.ts" />
/// <reference path="./@ember/-internals/environment/lib/global.d.ts" />
/// <reference path="./@ember/-internals/error-handling/index.d.ts" />
/// <reference path="./@ember/-internals/glimmer/index.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/component-managers/curly.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/component-managers/mount.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/component-managers/outlet.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/component-managers/root.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/component.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/components/abstract-input.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/components/input.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/components/internal.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/components/link-to.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/components/textarea.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/dom.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/environment.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/glimmer-component-docs.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/glimmer-tracking-docs.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helper.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/-disallow-dynamic-resolution.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/-in-element-null-check.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/-normalize-class.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/-resolve.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/-track-array.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/action.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/array.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/component.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/concat.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/each-in.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/fn.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/get.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/hash.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/helper.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/if-unless.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/internal-helper.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/log.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/modifier.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/mut.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/page-title.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/readonly.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/unbound.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/helpers/unique-id.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/modifiers/action.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/modifiers/internal.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/modifiers/on.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/renderer.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/resolver.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/setup-registry.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/syntax/in-element.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/syntax/let.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/syntax/mount.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/syntax/outlet.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/syntax/utils.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/template_registry.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/template.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/templates/empty.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/templates/input.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/templates/link-to.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/templates/outlet.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/templates/root.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/templates/textarea.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/bindings.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/curly-component-state-bucket.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/debug-render-message.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/iterator.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/managers.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/outlet.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/process-args.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/serialization-first-node-helpers.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/string.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/utils/to-bool.d.ts" />
/// <reference path="./@ember/-internals/glimmer/lib/views/outlet.d.ts" />
/// <reference path="./@ember/-internals/meta/index.d.ts" />
/// <reference path="./@ember/-internals/meta/lib/meta.d.ts" />
/// <reference path="./@ember/-internals/metal/index.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/alias.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/array_events.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/array.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/cache.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/cached.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/chain-tags.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/change_event.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/computed_cache.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/computed.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/decorator.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/dependent_keys.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/deprecate_property.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/each_proxy_events.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/events.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/expand_properties.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/get_properties.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/injected_property.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/libraries.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/namespace_search.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/observer.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/path_cache.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/properties.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/property_events.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/property_get.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/property_set.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/set_properties.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/tags.d.ts" />
/// <reference path="./@ember/-internals/metal/lib/tracked.d.ts" />
/// <reference path="./@ember/-internals/owner/index.d.ts" />
/// <reference path="./@ember/-internals/routing/index.d.ts" />
/// <reference path="./@ember/-internals/runtime/index.d.ts" />
/// <reference path="./@ember/-internals/runtime/lib/ext/rsvp.d.ts" />
/// <reference path="./@ember/-internals/runtime/lib/mixins/-proxy.d.ts" />
/// <reference path="./@ember/-internals/runtime/lib/mixins/action_handler.d.ts" />
/// <reference path="./@ember/-internals/runtime/lib/mixins/comparable.d.ts" />
/// <reference path="./@ember/-internals/runtime/lib/mixins/container_proxy.d.ts" />
/// <reference path="./@ember/-internals/runtime/lib/mixins/registry_proxy.d.ts" />
/// <reference path="./@ember/-internals/runtime/lib/mixins/target_action_support.d.ts" />
/// <reference path="./@ember/-internals/string/index.d.ts" />
/// <reference path="./@ember/-internals/utility-types/index.d.ts" />
/// <reference path="./@ember/-internals/utils/index.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/cache.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/dictionary.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/get-debug-name.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/guid.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/intern.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/invoke.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/is_proxy.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/lookup-descriptor.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/mandatory-setter.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/name.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/spec.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/super.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/symbol.d.ts" />
/// <reference path="./@ember/-internals/utils/lib/to-string.d.ts" />
/// <reference path="./@ember/-internals/views/index.d.ts" />
/// <reference path="./@ember/-internals/views/lib/compat/attrs.d.ts" />
/// <reference path="./@ember/-internals/views/lib/compat/fallback-view-registry.d.ts" />
/// <reference path="./@ember/-internals/views/lib/component_lookup.d.ts" />
/// <reference path="./@ember/-internals/views/lib/mixins/action_support.d.ts" />
/// <reference path="./@ember/-internals/views/lib/mixins/child_views_support.d.ts" />
/// <reference path="./@ember/-internals/views/lib/mixins/class_names_support.d.ts" />
/// <reference path="./@ember/-internals/views/lib/mixins/view_state_support.d.ts" />
/// <reference path="./@ember/-internals/views/lib/mixins/view_support.d.ts" />
/// <reference path="./@ember/-internals/views/lib/system/action_manager.d.ts" />
/// <reference path="./@ember/-internals/views/lib/system/event_dispatcher.d.ts" />
/// <reference path="./@ember/-internals/views/lib/system/utils.d.ts" />
/// <reference path="./@ember/-internals/views/lib/views/core_view.d.ts" />
/// <reference path="./@ember/-internals/views/lib/views/states.d.ts" />
/// <reference path="./@ember/application/index.d.ts" />
/// <reference path="./@ember/application/instance.d.ts" />
/// <reference path="./@ember/application/lib/lazy_load.d.ts" />
/// <reference path="./@ember/application/namespace.d.ts" />
/// <reference path="./@ember/array/-internals.d.ts" />
/// <reference path="./@ember/array/index.d.ts" />
/// <reference path="./@ember/array/lib/make-array.d.ts" />
/// <reference path="./@ember/array/mutable.d.ts" />
/// <reference path="./@ember/array/proxy.d.ts" />
/// <reference path="./@ember/canary-features/index.d.ts" />
/// <reference path="./@ember/component/helper.d.ts" />
/// <reference path="./@ember/component/index.d.ts" />
/// <reference path="./@ember/component/template-only.d.ts" />
/// <reference path="./@ember/controller/index.d.ts" />
/// <reference path="./@ember/controller/owner-ext.d.ts" />
/// <reference path="./@ember/debug/container-debug-adapter.d.ts" />
/// <reference path="./@ember/debug/data-adapter.d.ts" />
/// <reference path="./@ember/debug/index.d.ts" />
/// <reference path="./@ember/debug/lib/capture-render-tree.d.ts" />
/// <reference path="./@ember/debug/lib/deprecate.d.ts" />
/// <reference path="./@ember/debug/lib/handlers.d.ts" />
/// <reference path="./@ember/debug/lib/inspect.d.ts" />
/// <reference path="./@ember/debug/lib/testing.d.ts" />
/// <reference path="./@ember/debug/lib/warn.d.ts" />
/// <reference path="./@ember/deprecated-features/index.d.ts" />
/// <reference path="./@ember/destroyable/index.d.ts" />
/// <reference path="./@ember/engine/index.d.ts" />
/// <reference path="./@ember/engine/instance.d.ts" />
/// <reference path="./@ember/engine/lib/engine-parent.d.ts" />
/// <reference path="./@ember/enumerable/index.d.ts" />
/// <reference path="./@ember/enumerable/mutable.d.ts" />
/// <reference path="./@ember/helper/index.d.ts" />
/// <reference path="./@ember/instrumentation/index.d.ts" />
/// <reference path="./@ember/modifier/index.d.ts" />
/// <reference path="./@ember/object/-internals.d.ts" />
/// <reference path="./@ember/object/compat.d.ts" />
/// <reference path="./@ember/object/computed.d.ts" />
/// <reference path="./@ember/object/core.d.ts" />
/// <reference path="./@ember/object/evented.d.ts" />
/// <reference path="./@ember/object/events.d.ts" />
/// <reference path="./@ember/object/index.d.ts" />
/// <reference path="./@ember/object/internals.d.ts" />
/// <reference path="./@ember/object/lib/computed/computed_macros.d.ts" />
/// <reference path="./@ember/object/lib/computed/reduce_computed_macros.d.ts" />
/// <reference path="./@ember/object/mixin.d.ts" />
/// <reference path="./@ember/object/observable.d.ts" />
/// <reference path="./@ember/object/observers.d.ts" />
/// <reference path="./@ember/object/promise-proxy-mixin.d.ts" />
/// <reference path="./@ember/object/proxy.d.ts" />
/// <reference path="./@ember/owner/index.d.ts" />
/// <reference path="./@ember/renderer/index.d.ts" />
/// <reference path="./@ember/routing/-internals.d.ts" />
/// <reference path="./@ember/routing/hash-location.d.ts" />
/// <reference path="./@ember/routing/history-location.d.ts" />
/// <reference path="./@ember/routing/index.d.ts" />
/// <reference path="./@ember/routing/lib/cache.d.ts" />
/// <reference path="./@ember/routing/lib/controller_for.d.ts" />
/// <reference path="./@ember/routing/lib/dsl.d.ts" />
/// <reference path="./@ember/routing/lib/engines.d.ts" />
/// <reference path="./@ember/routing/lib/generate_controller.d.ts" />
/// <reference path="./@ember/routing/lib/location-utils.d.ts" />
/// <reference path="./@ember/routing/lib/query_params.d.ts" />
/// <reference path="./@ember/routing/lib/route-info.d.ts" />
/// <reference path="./@ember/routing/lib/router_state.d.ts" />
/// <reference path="./@ember/routing/lib/routing-service.d.ts" />
/// <reference path="./@ember/routing/lib/utils.d.ts" />
/// <reference path="./@ember/routing/location-ext.d.ts" />
/// <reference path="./@ember/routing/location.d.ts" />
/// <reference path="./@ember/routing/none-location.d.ts" />
/// <reference path="./@ember/routing/owner-ext.d.ts" />
/// <reference path="./@ember/routing/route-info.d.ts" />
/// <reference path="./@ember/routing/route.d.ts" />
/// <reference path="./@ember/routing/router-service.d.ts" />
/// <reference path="./@ember/routing/router.d.ts" />
/// <reference path="./@ember/routing/service-ext.d.ts" />
/// <reference path="./@ember/routing/transition.d.ts" />
/// <reference path="./@ember/runloop/-private/backburner.d.ts" />
/// <reference path="./@ember/runloop/index.d.ts" />
/// <reference path="./@ember/service/index.d.ts" />
/// <reference path="./@ember/service/owner-ext.d.ts" />
/// <reference path="./@ember/template-compilation/index.d.ts" />
/// <reference path="./@ember/template-factory/index.d.ts" />
/// <reference path="./@ember/template/index.d.ts" />
/// <reference path="./@ember/test/adapter.d.ts" />
/// <reference path="./@ember/test/index.d.ts" />
/// <reference path="./@ember/utils/index.d.ts" />
/// <reference path="./@ember/utils/lib/compare.d.ts" />
/// <reference path="./@ember/utils/lib/is_blank.d.ts" />
/// <reference path="./@ember/utils/lib/is_empty.d.ts" />
/// <reference path="./@ember/utils/lib/is_none.d.ts" />
/// <reference path="./@ember/utils/lib/is_present.d.ts" />
/// <reference path="./@ember/utils/lib/is-equal.d.ts" />
/// <reference path="./@ember/utils/lib/type-of.d.ts" />
/// <reference path="./@ember/version/index.d.ts" />
/// <reference path="./@glimmer/tracking/index.d.ts" />
/// <reference path="./@glimmer/tracking/primitives/cache.d.ts" />
/// <reference path="./ember-template-compiler/index.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/assert-against-attrs.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/assert-against-named-outlets.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/assert-input-helper-without-block.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/assert-reserved-named-arguments.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/assert-splattribute-expression.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/index.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/transform-action-syntax.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/transform-each-in-into-each.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/transform-each-track-array.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/transform-in-element.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/transform-resolutions.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/transform-wrap-mount-and-outlet.d.ts" />
/// <reference path="./ember-template-compiler/lib/plugins/utils.d.ts" />
/// <reference path="./ember-template-compiler/lib/public-api.d.ts" />
/// <reference path="./ember-template-compiler/lib/system/bootstrap.d.ts" />
/// <reference path="./ember-template-compiler/lib/system/calculate-location-display.d.ts" />
/// <reference path="./ember-template-compiler/lib/system/compile-options.d.ts" />
/// <reference path="./ember-template-compiler/lib/system/compile.d.ts" />
/// <reference path="./ember-template-compiler/lib/system/dasherize-component-name.d.ts" />
/// <reference path="./ember-template-compiler/lib/system/initializer.d.ts" />
/// <reference path="./ember-template-compiler/lib/system/precompile.d.ts" />
/// <reference path="./ember-template-compiler/lib/types.d.ts" />
/// <reference path="./ember-template-compiler/minimal.d.ts" />
/// <reference path="./ember-testing/index.d.ts" />
/// <reference path="./ember-testing/lib/adapters/adapter.d.ts" />
/// <reference path="./ember-testing/lib/adapters/qunit.d.ts" />
/// <reference path="./ember-testing/lib/ext/application.d.ts" />
/// <reference path="./ember-testing/lib/ext/rsvp.d.ts" />
/// <reference path="./ember-testing/lib/helpers.d.ts" />
/// <reference path="./ember-testing/lib/helpers/and_then.d.ts" />
/// <reference path="./ember-testing/lib/helpers/current_path.d.ts" />
/// <reference path="./ember-testing/lib/helpers/current_route_name.d.ts" />
/// <reference path="./ember-testing/lib/helpers/current_url.d.ts" />
/// <reference path="./ember-testing/lib/helpers/pause_test.d.ts" />
/// <reference path="./ember-testing/lib/helpers/visit.d.ts" />
/// <reference path="./ember-testing/lib/helpers/wait.d.ts" />
/// <reference path="./ember-testing/lib/initializers.d.ts" />
/// <reference path="./ember-testing/lib/public-api.d.ts" />
/// <reference path="./ember-testing/lib/setup_for_testing.d.ts" />
/// <reference path="./ember-testing/lib/test.d.ts" />
/// <reference path="./ember-testing/lib/test/adapter.d.ts" />
/// <reference path="./ember-testing/lib/test/helpers.d.ts" />
/// <reference path="./ember-testing/lib/test/on_inject_helpers.d.ts" />
/// <reference path="./ember-testing/lib/test/pending_requests.d.ts" />
/// <reference path="./ember-testing/lib/test/promise.d.ts" />
/// <reference path="./ember-testing/lib/test/run.d.ts" />
/// <reference path="./ember-testing/lib/test/waiters.d.ts" />
/// <reference path="./ember/index.d.ts" />
/// <reference path="./ember/version.d.ts" />
/// <reference path="./loader/lib/index.d.ts" />
/// <reference path="./require.d.ts" />
