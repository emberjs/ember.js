/* eslint-disable */

// This file was derived from the output of the classic broccoli-based build of
// ember.debug.js. It's intended to convey exactly how the authored ES modules
// get mapped into backward-compatible AMD defines.
//
// The testing-specific modules that only appear in this bundle in development
// builds are not included in this file. They're in ./ember-testing.js, which
// our legacy bundle rollup config concatenates with this one for dev builds.
//
// (Typical apps actually work fine if we *don't* stick the testing modules into
// this bundle at all! Because the ember-testing.js bundle itself gets into the
// classic test-support.js. So they are double-included. But as these are
// backward-compatibility bundles, I'm going to keep that wacky behavior for
// them since somebody could be relying on the timing of having the test modules
// available before test-support.js evals.

import d from 'amd-compat-entrypoint-definition';

import * as emberinternalsBrowserEnvironmentIndex from '@ember/-internals/browser-environment/index';
here(@ember/-internals/browser-environment/index);

import * as emberinternalsContainerIndex from '@ember/-internals/container/index';
here(@ember/-internals/container/index);

import * as emberinternalsDeprecationsIndex from '@ember/-internals/deprecations/index';
here(@ember/-internals/deprecations/index);

import * as emberinternalsEnvironmentIndex from '@ember/-internals/environment/index';
here(@ember/-internals/environment/index);

import * as emberinternalsErrorHandlingIndex from '@ember/-internals/error-handling/index';
here(@ember/-internals/error-handling/index);

import * as emberinternalsGlimmerIndex from '@ember/-internals/glimmer/index';
here(@ember/-internals/glimmer/index);

import * as emberinternalsMetaIndex from '@ember/-internals/meta/index';
here(@ember/-internals/meta/index);

import * as emberinternalsMetaLibMeta from '@ember/-internals/meta/lib/meta';
here(@ember/-internals/meta/lib/meta);

import * as emberinternalsMetalIndex from '@ember/-internals/metal/index';
here(@ember/-internals/metal/index);

import * as emberinternalsOwnerIndex from '@ember/-internals/owner/index';
here(@ember/-internals/owner/index);

import * as emberinternalsRoutingIndex from '@ember/-internals/routing/index';
here(@ember/-internals/routing/index);

import * as emberinternalsRuntimeIndex from '@ember/-internals/runtime/index';
here(@ember/-internals/runtime/index);

import * as emberinternalsRuntimeLibExtRsvp from '@ember/-internals/runtime/lib/ext/rsvp';
here(@ember/-internals/runtime/lib/ext/rsvp);

import * as emberinternalsRuntimeLibMixinsproxy from '@ember/-internals/runtime/lib/mixins/-proxy';
here(@ember/-internals/runtime/lib/mixins/-proxy);

import * as emberinternalsRuntimeLibMixinsActionHandler from '@ember/-internals/runtime/lib/mixins/action_handler';
d(
  '@ember/-internals/runtime/lib/mixins/action_handler',
  emberinternalsRuntimeLibMixinsActionHandler
);

import * as emberinternalsRuntimeLibMixinsComparable from '@ember/-internals/runtime/lib/mixins/comparable';
here(@ember/-internals/runtime/lib/mixins/comparable);

import * as emberinternalsRuntimeLibMixinsContainerProxy from '@ember/-internals/runtime/lib/mixins/container_proxy';
d(
  '@ember/-internals/runtime/lib/mixins/container_proxy',
  emberinternalsRuntimeLibMixinsContainerProxy
);

import * as emberinternalsRuntimeLibMixinsRegistryProxy from '@ember/-internals/runtime/lib/mixins/registry_proxy';
d(
  '@ember/-internals/runtime/lib/mixins/registry_proxy',
  emberinternalsRuntimeLibMixinsRegistryProxy
);

import * as emberinternalsRuntimeLibMixinsTargetActionSupport from '@ember/-internals/runtime/lib/mixins/target_action_support';
d(
  '@ember/-internals/runtime/lib/mixins/target_action_support',
  emberinternalsRuntimeLibMixinsTargetActionSupport
);

import * as emberinternalsStringIndex from '@ember/-internals/string/index';
here(@ember/-internals/string/index);

import * as emberinternalsUtilityTypesIndex from '@ember/-internals/utility-types/index';
here(@ember/-internals/utility-types/index);

import * as emberinternalsUtilsIndex from '@ember/-internals/utils/index';
here(@ember/-internals/utils/index);

import * as emberinternalsViewsIndex from '@ember/-internals/views/index';
here(@ember/-internals/views/index);

import * as emberinternalsViewsLibCompatAttrs from '@ember/-internals/views/lib/compat/attrs';
here(@ember/-internals/views/lib/compat/attrs);

import * as emberinternalsViewsLibCompatFallbackViewRegistry from '@ember/-internals/views/lib/compat/fallback-view-registry';
d(
  '@ember/-internals/views/lib/compat/fallback-view-registry',
  emberinternalsViewsLibCompatFallbackViewRegistry
);

import * as emberinternalsViewsLibComponentLookup from '@ember/-internals/views/lib/component_lookup';
here(@ember/-internals/views/lib/component_lookup);

import * as emberinternalsViewsLibMixinsActionSupport from '@ember/-internals/views/lib/mixins/action_support';
here(@ember/-internals/views/lib/mixins/action_support);

import * as emberinternalsViewsLibSystemEventDispatcher from '@ember/-internals/views/lib/system/event_dispatcher';
d(
  '@ember/-internals/views/lib/system/event_dispatcher',
  emberinternalsViewsLibSystemEventDispatcher
);

import * as emberinternalsViewsLibSystemUtils from '@ember/-internals/views/lib/system/utils';
here(@ember/-internals/views/lib/system/utils);

import * as emberinternalsViewsLibViewsCoreView from '@ember/-internals/views/lib/views/core_view';
here(@ember/-internals/views/lib/views/core_view);

import * as emberinternalsViewsLibViewsStates from '@ember/-internals/views/lib/views/states';
here(@ember/-internals/views/lib/views/states);

import * as emberApplicationIndex from '@ember/application/index';
here(@ember/application/index);

import * as emberApplicationInstance from '@ember/application/instance';
here(@ember/application/instance);

import * as emberApplicationLibLazyLoad from '@ember/application/lib/lazy_load';
here(@ember/application/lib/lazy_load);

import * as emberApplicationNamespace from '@ember/application/namespace';
here(@ember/application/namespace);

import * as emberArrayinternals from '@ember/array/-internals';
here(@ember/array/-internals);

import * as emberArrayIndex from '@ember/array/index';
here(@ember/array/index);

import * as emberArrayLibMakeArray from '@ember/array/lib/make-array';
here(@ember/array/lib/make-array);

import * as emberArrayMutable from '@ember/array/mutable';
here(@ember/array/mutable);

import * as emberArrayProxy from '@ember/array/proxy';
here(@ember/array/proxy);

import * as emberCanaryFeaturesIndex from '@ember/canary-features/index';
here(@ember/canary-features/index);

import * as emberComponentHelper from '@ember/component/helper';
here(@ember/component/helper);

import * as emberComponentIndex from '@ember/component/index';
here(@ember/component/index);

import * as emberComponentTemplateOnly from '@ember/component/template-only';
here(@ember/component/template-only);

import * as emberControllerIndex from '@ember/controller/index';
here(@ember/controller/index);

import * as emberDebugIndex from '@ember/debug/index';
here(@ember/debug/index);

import * as emberDebugLibCaptureRenderTree from '@ember/debug/lib/capture-render-tree';
here(@ember/debug/lib/capture-render-tree);

import * as emberDebugLibDeprecate from '@ember/debug/lib/deprecate';
here(@ember/debug/lib/deprecate);

import * as emberDebugLibHandlers from '@ember/debug/lib/handlers';
here(@ember/debug/lib/handlers);

import * as emberDebugLibInspect from '@ember/debug/lib/inspect';
here(@ember/debug/lib/inspect);

import * as emberDebugLibTesting from '@ember/debug/lib/testing';
here(@ember/debug/lib/testing);

import * as emberDebugLibWarn from '@ember/debug/lib/warn';
here(@ember/debug/lib/warn);

import * as emberDebugContainerDebugAdapter from '@ember/debug/container-debug-adapter';
here(@ember/debug/container-debug-adapter);

import * as emberDebugDataAdapter from '@ember/debug/data-adapter';
here(@ember/debug/data-adapter);

import * as emberDeprecatedFeaturesIndex from '@ember/deprecated-features/index';
here(@ember/deprecated-features/index);

import * as emberDestroyableIndex from '@ember/destroyable/index';
here(@ember/destroyable/index);

import * as emberEngineIndex from '@ember/engine/index';
here(@ember/engine/index);

import * as emberEngineInstance from '@ember/engine/instance';
here(@ember/engine/instance);

import * as emberEngineLibEngineParent from '@ember/engine/lib/engine-parent';
here(@ember/engine/lib/engine-parent);

import * as emberEnumerableIndex from '@ember/enumerable/index';
here(@ember/enumerable/index);

import * as emberEnumerableMutable from '@ember/enumerable/mutable';
here(@ember/enumerable/mutable);

import * as emberHelperIndex from '@ember/helper/index';
here(@ember/helper/index);

import * as emberInstrumentationIndex from '@ember/instrumentation/index';
here(@ember/instrumentation/index);

import * as emberModifierIndex from '@ember/modifier/index';
here(@ember/modifier/index);

import * as emberObjectinternals from '@ember/object/-internals';
here(@ember/object/-internals);

import * as emberObjectCompat from '@ember/object/compat';
here(@ember/object/compat);

import * as emberObjectComputed from '@ember/object/computed';
here(@ember/object/computed);

import * as emberObjectCore from '@ember/object/core';
here(@ember/object/core);

import * as emberObjectEvented from '@ember/object/evented';
here(@ember/object/evented);

import * as emberObjectEvents from '@ember/object/events';
here(@ember/object/events);

import * as emberObjectIndex from '@ember/object/index';
here(@ember/object/index);

import * as emberObjectInternals from '@ember/object/internals';
here(@ember/object/internals);

import * as emberObjectLibComputedComputedMacros from '@ember/object/lib/computed/computed_macros';
here(@ember/object/lib/computed/computed_macros);

import * as emberObjectLibComputedReduceComputedMacros from '@ember/object/lib/computed/reduce_computed_macros';
here(@ember/object/lib/computed/reduce_computed_macros);

import * as emberObjectMixin from '@ember/object/mixin';
here(@ember/object/mixin);

import * as emberObjectObservable from '@ember/object/observable';
here(@ember/object/observable);

import * as emberObjectObservers from '@ember/object/observers';
here(@ember/object/observers);

import * as emberObjectPromiseProxyMixin from '@ember/object/promise-proxy-mixin';
here(@ember/object/promise-proxy-mixin);

import * as emberObjectProxy from '@ember/object/proxy';
here(@ember/object/proxy);

import * as emberOwnerIndex from '@ember/owner/index';
here(@ember/owner/index);

import * as emberRendererIndex from '@ember/renderer/index';
here(@ember/renderer/index);

import * as emberRoutinginternals from '@ember/routing/-internals';
here(@ember/routing/-internals);

import * as emberRoutingHashLocation from '@ember/routing/hash-location';
here(@ember/routing/hash-location);

import * as emberRoutingHistoryLocation from '@ember/routing/history-location';
here(@ember/routing/history-location);

import * as emberRoutingIndex from '@ember/routing/index';
here(@ember/routing/index);

import * as emberRoutingLibCache from '@ember/routing/lib/cache';
here(@ember/routing/lib/cache);

import * as emberRoutingLibControllerFor from '@ember/routing/lib/controller_for';
here(@ember/routing/lib/controller_for);

import * as emberRoutingLibDsl from '@ember/routing/lib/dsl';
here(@ember/routing/lib/dsl);

import * as emberRoutingLibEngines from '@ember/routing/lib/engines';
here(@ember/routing/lib/engines);

import * as emberRoutingLibGenerateController from '@ember/routing/lib/generate_controller';
here(@ember/routing/lib/generate_controller);

import * as emberRoutingLibLocationUtils from '@ember/routing/lib/location-utils';
here(@ember/routing/lib/location-utils);

import * as emberRoutingLibQueryParams from '@ember/routing/lib/query_params';
here(@ember/routing/lib/query_params);

import * as emberRoutingLibRouteInfo from '@ember/routing/lib/route-info';
here(@ember/routing/lib/route-info);

import * as emberRoutingLibRouterState from '@ember/routing/lib/router_state';
here(@ember/routing/lib/router_state);

import * as emberRoutingLibRoutingService from '@ember/routing/lib/routing-service';
here(@ember/routing/lib/routing-service);

import * as emberRoutingLibUtils from '@ember/routing/lib/utils';
here(@ember/routing/lib/utils);

import * as emberRoutingLocation from '@ember/routing/location';
here(@ember/routing/location);

import * as emberRoutingNoneLocation from '@ember/routing/none-location';
here(@ember/routing/none-location);

import * as emberRoutingRouteInfo from '@ember/routing/route-info';
here(@ember/routing/route-info);

import * as emberRoutingRoute from '@ember/routing/route';
here(@ember/routing/route);

import * as emberRoutingRouterService from '@ember/routing/router-service';
here(@ember/routing/router-service);

import * as emberRoutingRouter from '@ember/routing/router';
here(@ember/routing/router);

import * as emberRoutingTransition from '@ember/routing/transition';
here(@ember/routing/transition);

import * as emberRunloopprivateBackburner from '@ember/runloop/-private/backburner';
here(@ember/runloop/-private/backburner);

import * as emberRunloopIndex from '@ember/runloop/index';
here(@ember/runloop/index);

import * as emberServiceIndex from '@ember/service/index';
here(@ember/service/index);

import * as emberTemplateCompilationIndex from '@ember/template-compilation/index';
here(@ember/template-compilation/index);

import * as emberTemplateFactoryIndex from '@ember/template-factory/index';
here(@ember/template-factory/index);

import * as emberTemplateIndex from '@ember/template/index';
here(@ember/template/index);

import * as emberTestAdapter from '@ember/test/adapter';
here(@ember/test/adapter);

import * as emberTestIndex from '@ember/test/index';
here(@ember/test/index);

import * as emberUtilsIndex from '@ember/utils/index';
here(@ember/utils/index);

import * as emberUtilsLibCompare from '@ember/utils/lib/compare';
here(@ember/utils/lib/compare);

import * as emberUtilsLibIsEqual from '@ember/utils/lib/is-equal';
here(@ember/utils/lib/is-equal);

import * as emberUtilsLibIsBlank from '@ember/utils/lib/is_blank';
here(@ember/utils/lib/is_blank);

import * as emberUtilsLibIsEmpty from '@ember/utils/lib/is_empty';
here(@ember/utils/lib/is_empty);

import * as emberUtilsLibIsNone from '@ember/utils/lib/is_none';
here(@ember/utils/lib/is_none);

import * as emberUtilsLibIsPresent from '@ember/utils/lib/is_present';
here(@ember/utils/lib/is_present);

import * as emberUtilsLibTypeOf from '@ember/utils/lib/type-of';
here(@ember/utils/lib/type-of);

import * as emberVersionIndex from '@ember/version/index';
here(@ember/version/index);

import * as glimmerDestroyable from '@glimmer/destroyable';
here(@glimmer/destroyable);

import * as glimmerEncoder from '@glimmer/encoder';
here(@glimmer/encoder);

import * as glimmerEnv from '@glimmer/env';
here(@glimmer/env);

import * as glimmerGlobalContext from '@glimmer/global-context';
here(@glimmer/global-context);

import * as glimmerManager from '@glimmer/manager';
here(@glimmer/manager);

import * as glimmerNode from '@glimmer/node';
here(@glimmer/node);

import * as glimmerOpcodeCompiler from '@glimmer/opcode-compiler';
here(@glimmer/opcode-compiler);

import * as glimmerOwner from '@glimmer/owner';
here(@glimmer/owner);

import * as glimmerProgram from '@glimmer/program';
here(@glimmer/program);

import * as glimmerReference from '@glimmer/reference';
here(@glimmer/reference);

import * as glimmerRuntime from '@glimmer/runtime';
here(@glimmer/runtime);

import * as glimmerTrackingIndex from '@glimmer/tracking/index';
here(@glimmer/tracking/index);

import * as glimmerTrackingPrimitivesCache from '@glimmer/tracking/primitives/cache';
here(@glimmer/tracking/primitives/cache);

import * as glimmerUtil from '@glimmer/util';
here(@glimmer/util);

import * as glimmerValidator from '@glimmer/validator';
here(@glimmer/validator);

import * as glimmerVm from '@glimmer/vm';
here(@glimmer/vm);

import * as glimmerWireFormat from '@glimmer/wire-format';
here(@glimmer/wire-format);

import * as simpleDomDocument from '@simple-dom/document';
here(@simple-dom/document);

import * as backburnerjs from 'backburner.js';
here(backburner.js);

import * as dagMap from 'dag-map';
here(dag-map);

import * as emberIndex from 'ember/index';
here(ember/index);

import * as emberVersion from 'ember/version';
here(ember/version);

import * as routeRecognizer from 'route-recognizer';
here(route-recognizer);

import * as routerJs from 'router_js';
here(router_js);

import * as rsvp from 'rsvp';
here(rsvp);

if (typeof module === 'object' && typeof module.require === 'function') {
  module.exports = emberIndex.default;
}
