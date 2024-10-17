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
d('@ember/-internals/browser-environment/index', emberinternalsBrowserEnvironmentIndex);

import * as emberinternalsContainerIndex from '@ember/-internals/container/index';
d('@ember/-internals/container/index', emberinternalsContainerIndex);

import * as emberinternalsDeprecationsIndex from '@ember/-internals/deprecations/index';
d('@ember/-internals/deprecations/index', emberinternalsDeprecationsIndex);

import * as emberinternalsEnvironmentIndex from '@ember/-internals/environment/index';
d('@ember/-internals/environment/index', emberinternalsEnvironmentIndex);

import * as emberinternalsErrorHandlingIndex from '@ember/-internals/error-handling/index';
d('@ember/-internals/error-handling/index', emberinternalsErrorHandlingIndex);

import * as emberinternalsGlimmerIndex from '@ember/-internals/glimmer/index';
d('@ember/-internals/glimmer/index', emberinternalsGlimmerIndex);

import * as emberinternalsMetaIndex from '@ember/-internals/meta/index';
d('@ember/-internals/meta/index', emberinternalsMetaIndex);

import * as emberinternalsMetaLibMeta from '@ember/-internals/meta/lib/meta';
d('@ember/-internals/meta/lib/meta', emberinternalsMetaLibMeta);

import * as emberinternalsMetalIndex from '@ember/-internals/metal/index';
d('@ember/-internals/metal/index', emberinternalsMetalIndex);

import * as emberinternalsOwnerIndex from '@ember/-internals/owner/index';
d('@ember/-internals/owner/index', emberinternalsOwnerIndex);

import * as emberinternalsRoutingIndex from '@ember/-internals/routing/index';
d('@ember/-internals/routing/index', emberinternalsRoutingIndex);

import * as emberinternalsRuntimeIndex from '@ember/-internals/runtime/index';
d('@ember/-internals/runtime/index', emberinternalsRuntimeIndex);

import * as emberinternalsRuntimeLibExtRsvp from '@ember/-internals/runtime/lib/ext/rsvp';
d('@ember/-internals/runtime/lib/ext/rsvp', emberinternalsRuntimeLibExtRsvp);

import * as emberinternalsRuntimeLibMixinsproxy from '@ember/-internals/runtime/lib/mixins/-proxy';
d('@ember/-internals/runtime/lib/mixins/-proxy', emberinternalsRuntimeLibMixinsproxy);

import * as emberinternalsRuntimeLibMixinsActionHandler from '@ember/-internals/runtime/lib/mixins/action_handler';
d(
  '@ember/-internals/runtime/lib/mixins/action_handler',
  emberinternalsRuntimeLibMixinsActionHandler
);

import * as emberinternalsRuntimeLibMixinsComparable from '@ember/-internals/runtime/lib/mixins/comparable';
d('@ember/-internals/runtime/lib/mixins/comparable', emberinternalsRuntimeLibMixinsComparable);

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
d('@ember/-internals/string/index', emberinternalsStringIndex);

import * as emberinternalsUtilityTypesIndex from '@ember/-internals/utility-types/index';
d('@ember/-internals/utility-types/index', emberinternalsUtilityTypesIndex);

import * as emberinternalsUtilsIndex from '@ember/-internals/utils/index';
d('@ember/-internals/utils/index', emberinternalsUtilsIndex);

import * as emberinternalsViewsIndex from '@ember/-internals/views/index';
d('@ember/-internals/views/index', emberinternalsViewsIndex);

import * as emberinternalsViewsLibCompatAttrs from '@ember/-internals/views/lib/compat/attrs';
d('@ember/-internals/views/lib/compat/attrs', emberinternalsViewsLibCompatAttrs);

import * as emberinternalsViewsLibCompatFallbackViewRegistry from '@ember/-internals/views/lib/compat/fallback-view-registry';
d(
  '@ember/-internals/views/lib/compat/fallback-view-registry',
  emberinternalsViewsLibCompatFallbackViewRegistry
);

import * as emberinternalsViewsLibComponentLookup from '@ember/-internals/views/lib/component_lookup';
d('@ember/-internals/views/lib/component_lookup', emberinternalsViewsLibComponentLookup);

import * as emberinternalsViewsLibMixinsActionSupport from '@ember/-internals/views/lib/mixins/action_support';
d('@ember/-internals/views/lib/mixins/action_support', emberinternalsViewsLibMixinsActionSupport);

import * as emberinternalsViewsLibMixinsChildViewsSupport from '@ember/-internals/views/lib/mixins/child_views_support';
d(
  '@ember/-internals/views/lib/mixins/child_views_support',
  emberinternalsViewsLibMixinsChildViewsSupport
);

import * as emberinternalsViewsLibMixinsClassNamesSupport from '@ember/-internals/views/lib/mixins/class_names_support';
d(
  '@ember/-internals/views/lib/mixins/class_names_support',
  emberinternalsViewsLibMixinsClassNamesSupport
);

import * as emberinternalsViewsLibMixinsViewStateSupport from '@ember/-internals/views/lib/mixins/view_state_support';
d(
  '@ember/-internals/views/lib/mixins/view_state_support',
  emberinternalsViewsLibMixinsViewStateSupport
);

import * as emberinternalsViewsLibMixinsViewSupport from '@ember/-internals/views/lib/mixins/view_support';
d('@ember/-internals/views/lib/mixins/view_support', emberinternalsViewsLibMixinsViewSupport);

import * as emberinternalsViewsLibSystemActionManager from '@ember/-internals/views/lib/system/action_manager';
d('@ember/-internals/views/lib/system/action_manager', emberinternalsViewsLibSystemActionManager);

import * as emberinternalsViewsLibSystemEventDispatcher from '@ember/-internals/views/lib/system/event_dispatcher';
d(
  '@ember/-internals/views/lib/system/event_dispatcher',
  emberinternalsViewsLibSystemEventDispatcher
);

import * as emberinternalsViewsLibSystemUtils from '@ember/-internals/views/lib/system/utils';
d('@ember/-internals/views/lib/system/utils', emberinternalsViewsLibSystemUtils);

import * as emberinternalsViewsLibViewsCoreView from '@ember/-internals/views/lib/views/core_view';
d('@ember/-internals/views/lib/views/core_view', emberinternalsViewsLibViewsCoreView);

import * as emberinternalsViewsLibViewsStates from '@ember/-internals/views/lib/views/states';
d('@ember/-internals/views/lib/views/states', emberinternalsViewsLibViewsStates);

import * as emberApplicationIndex from '@ember/application/index';
d('@ember/application/index', emberApplicationIndex);

import * as emberApplicationInstance from '@ember/application/instance';
d('@ember/application/instance', emberApplicationInstance);

import * as emberApplicationLibLazyLoad from '@ember/application/lib/lazy_load';
d('@ember/application/lib/lazy_load', emberApplicationLibLazyLoad);

import * as emberApplicationNamespace from '@ember/application/namespace';
d('@ember/application/namespace', emberApplicationNamespace);

import * as emberArrayinternals from '@ember/array/-internals';
d('@ember/array/-internals', emberArrayinternals);

import * as emberArrayIndex from '@ember/array/index';
d('@ember/array/index', emberArrayIndex);

import * as emberArrayLibMakeArray from '@ember/array/lib/make-array';
d('@ember/array/lib/make-array', emberArrayLibMakeArray);

import * as emberArrayMutable from '@ember/array/mutable';
d('@ember/array/mutable', emberArrayMutable);

import * as emberArrayProxy from '@ember/array/proxy';
d('@ember/array/proxy', emberArrayProxy);

import * as emberCanaryFeaturesIndex from '@ember/canary-features/index';
d('@ember/canary-features/index', emberCanaryFeaturesIndex);

import * as emberComponentHelper from '@ember/component/helper';
d('@ember/component/helper', emberComponentHelper);

import * as emberComponentIndex from '@ember/component/index';
d('@ember/component/index', emberComponentIndex);

import * as emberComponentTemplateOnly from '@ember/component/template-only';
d('@ember/component/template-only', emberComponentTemplateOnly);

import * as emberControllerIndex from '@ember/controller/index';
d('@ember/controller/index', emberControllerIndex);

import * as emberDebugIndex from '@ember/debug/index';
d('@ember/debug/index', emberDebugIndex);

import * as emberDebugInspectorSupportIndex from '@ember/debug/ember-inspector-support/index';
d('@ember/debug/ember-inspector-support/index', emberDebugInspectorSupportIndex);

import * as emberDebugLibCaptureRenderTree from '@ember/debug/lib/capture-render-tree';
d('@ember/debug/lib/capture-render-tree', emberDebugLibCaptureRenderTree);

import * as emberDebugLibDeprecate from '@ember/debug/lib/deprecate';
d('@ember/debug/lib/deprecate', emberDebugLibDeprecate);

import * as emberDebugLibHandlers from '@ember/debug/lib/handlers';
d('@ember/debug/lib/handlers', emberDebugLibHandlers);

import * as emberDebugLibInspect from '@ember/debug/lib/inspect';
d('@ember/debug/lib/inspect', emberDebugLibInspect);

import * as emberDebugLibTesting from '@ember/debug/lib/testing';
d('@ember/debug/lib/testing', emberDebugLibTesting);

import * as emberDebugLibWarn from '@ember/debug/lib/warn';
d('@ember/debug/lib/warn', emberDebugLibWarn);

import * as emberDebugContainerDebugAdapter from '@ember/debug/container-debug-adapter';
d('@ember/debug/container-debug-adapter', emberDebugContainerDebugAdapter);

import * as emberDebugDataAdapter from '@ember/debug/data-adapter';
d('@ember/debug/data-adapter', emberDebugDataAdapter);

import * as emberDeprecatedFeaturesIndex from '@ember/deprecated-features/index';
d('@ember/deprecated-features/index', emberDeprecatedFeaturesIndex);

import * as emberDestroyableIndex from '@ember/destroyable/index';
d('@ember/destroyable/index', emberDestroyableIndex);

import * as emberEngineIndex from '@ember/engine/index';
d('@ember/engine/index', emberEngineIndex);

import * as emberEngineInstance from '@ember/engine/instance';
d('@ember/engine/instance', emberEngineInstance);

import * as emberEngineLibEngineParent from '@ember/engine/lib/engine-parent';
d('@ember/engine/lib/engine-parent', emberEngineLibEngineParent);

import * as emberEnumerableIndex from '@ember/enumerable/index';
d('@ember/enumerable/index', emberEnumerableIndex);

import * as emberEnumerableMutable from '@ember/enumerable/mutable';
d('@ember/enumerable/mutable', emberEnumerableMutable);

import * as emberHelperIndex from '@ember/helper/index';
d('@ember/helper/index', emberHelperIndex);

import * as emberInstrumentationIndex from '@ember/instrumentation/index';
d('@ember/instrumentation/index', emberInstrumentationIndex);

import * as emberModifierIndex from '@ember/modifier/index';
d('@ember/modifier/index', emberModifierIndex);

import * as emberObjectinternals from '@ember/object/-internals';
d('@ember/object/-internals', emberObjectinternals);

import * as emberObjectCompat from '@ember/object/compat';
d('@ember/object/compat', emberObjectCompat);

import * as emberObjectComputed from '@ember/object/computed';
d('@ember/object/computed', emberObjectComputed);

import * as emberObjectCore from '@ember/object/core';
d('@ember/object/core', emberObjectCore);

import * as emberObjectEvented from '@ember/object/evented';
d('@ember/object/evented', emberObjectEvented);

import * as emberObjectEvents from '@ember/object/events';
d('@ember/object/events', emberObjectEvents);

import * as emberObjectIndex from '@ember/object/index';
d('@ember/object/index', emberObjectIndex);

import * as emberObjectInternals from '@ember/object/internals';
d('@ember/object/internals', emberObjectInternals);

import * as emberObjectLibComputedComputedMacros from '@ember/object/lib/computed/computed_macros';
d('@ember/object/lib/computed/computed_macros', emberObjectLibComputedComputedMacros);

import * as emberObjectLibComputedReduceComputedMacros from '@ember/object/lib/computed/reduce_computed_macros';
d('@ember/object/lib/computed/reduce_computed_macros', emberObjectLibComputedReduceComputedMacros);

import * as emberObjectMixin from '@ember/object/mixin';
d('@ember/object/mixin', emberObjectMixin);

import * as emberObjectObservable from '@ember/object/observable';
d('@ember/object/observable', emberObjectObservable);

import * as emberObjectObservers from '@ember/object/observers';
d('@ember/object/observers', emberObjectObservers);

import * as emberObjectPromiseProxyMixin from '@ember/object/promise-proxy-mixin';
d('@ember/object/promise-proxy-mixin', emberObjectPromiseProxyMixin);

import * as emberObjectProxy from '@ember/object/proxy';
d('@ember/object/proxy', emberObjectProxy);

import * as emberOwnerIndex from '@ember/owner/index';
d('@ember/owner/index', emberOwnerIndex);

import * as emberRendererIndex from '@ember/renderer/index';
d('@ember/renderer/index', emberRendererIndex);

import * as emberRoutinginternals from '@ember/routing/-internals';
d('@ember/routing/-internals', emberRoutinginternals);

import * as emberRoutingHashLocation from '@ember/routing/hash-location';
d('@ember/routing/hash-location', emberRoutingHashLocation);

import * as emberRoutingHistoryLocation from '@ember/routing/history-location';
d('@ember/routing/history-location', emberRoutingHistoryLocation);

import * as emberRoutingIndex from '@ember/routing/index';
d('@ember/routing/index', emberRoutingIndex);

import * as emberRoutingLibCache from '@ember/routing/lib/cache';
d('@ember/routing/lib/cache', emberRoutingLibCache);

import * as emberRoutingLibControllerFor from '@ember/routing/lib/controller_for';
d('@ember/routing/lib/controller_for', emberRoutingLibControllerFor);

import * as emberRoutingLibDsl from '@ember/routing/lib/dsl';
d('@ember/routing/lib/dsl', emberRoutingLibDsl);

import * as emberRoutingLibEngines from '@ember/routing/lib/engines';
d('@ember/routing/lib/engines', emberRoutingLibEngines);

import * as emberRoutingLibGenerateController from '@ember/routing/lib/generate_controller';
d('@ember/routing/lib/generate_controller', emberRoutingLibGenerateController);

import * as emberRoutingLibLocationUtils from '@ember/routing/lib/location-utils';
d('@ember/routing/lib/location-utils', emberRoutingLibLocationUtils);

import * as emberRoutingLibQueryParams from '@ember/routing/lib/query_params';
d('@ember/routing/lib/query_params', emberRoutingLibQueryParams);

import * as emberRoutingLibRouteInfo from '@ember/routing/lib/route-info';
d('@ember/routing/lib/route-info', emberRoutingLibRouteInfo);

import * as emberRoutingLibRouterState from '@ember/routing/lib/router_state';
d('@ember/routing/lib/router_state', emberRoutingLibRouterState);

import * as emberRoutingLibRoutingService from '@ember/routing/lib/routing-service';
d('@ember/routing/lib/routing-service', emberRoutingLibRoutingService);

import * as emberRoutingLibUtils from '@ember/routing/lib/utils';
d('@ember/routing/lib/utils', emberRoutingLibUtils);

import * as emberRoutingLocation from '@ember/routing/location';
d('@ember/routing/location', emberRoutingLocation);

import * as emberRoutingNoneLocation from '@ember/routing/none-location';
d('@ember/routing/none-location', emberRoutingNoneLocation);

import * as emberRoutingRouteInfo from '@ember/routing/route-info';
d('@ember/routing/route-info', emberRoutingRouteInfo);

import * as emberRoutingRoute from '@ember/routing/route';
d('@ember/routing/route', emberRoutingRoute);

import * as emberRoutingRouterService from '@ember/routing/router-service';
d('@ember/routing/router-service', emberRoutingRouterService);

import * as emberRoutingRouter from '@ember/routing/router';
d('@ember/routing/router', emberRoutingRouter);

import * as emberRoutingTransition from '@ember/routing/transition';
d('@ember/routing/transition', emberRoutingTransition);

import * as emberRunloopprivateBackburner from '@ember/runloop/-private/backburner';
d('@ember/runloop/-private/backburner', emberRunloopprivateBackburner);

import * as emberRunloopIndex from '@ember/runloop/index';
d('@ember/runloop/index', emberRunloopIndex);

import * as emberServiceIndex from '@ember/service/index';
d('@ember/service/index', emberServiceIndex);

import * as emberTemplateCompilationIndex from '@ember/template-compilation/index';
d('@ember/template-compilation/index', emberTemplateCompilationIndex);

import * as emberTemplateFactoryIndex from '@ember/template-factory/index';
d('@ember/template-factory/index', emberTemplateFactoryIndex);

import * as emberTemplateIndex from '@ember/template/index';
d('@ember/template/index', emberTemplateIndex);

import * as emberTestAdapter from '@ember/test/adapter';
d('@ember/test/adapter', emberTestAdapter);

import * as emberTestIndex from '@ember/test/index';
d('@ember/test/index', emberTestIndex);

import * as emberUtilsIndex from '@ember/utils/index';
d('@ember/utils/index', emberUtilsIndex);

import * as emberUtilsLibCompare from '@ember/utils/lib/compare';
d('@ember/utils/lib/compare', emberUtilsLibCompare);

import * as emberUtilsLibIsEqual from '@ember/utils/lib/is-equal';
d('@ember/utils/lib/is-equal', emberUtilsLibIsEqual);

import * as emberUtilsLibIsBlank from '@ember/utils/lib/is_blank';
d('@ember/utils/lib/is_blank', emberUtilsLibIsBlank);

import * as emberUtilsLibIsEmpty from '@ember/utils/lib/is_empty';
d('@ember/utils/lib/is_empty', emberUtilsLibIsEmpty);

import * as emberUtilsLibIsNone from '@ember/utils/lib/is_none';
d('@ember/utils/lib/is_none', emberUtilsLibIsNone);

import * as emberUtilsLibIsPresent from '@ember/utils/lib/is_present';
d('@ember/utils/lib/is_present', emberUtilsLibIsPresent);

import * as emberUtilsLibTypeOf from '@ember/utils/lib/type-of';
d('@ember/utils/lib/type-of', emberUtilsLibTypeOf);

import * as emberVersionIndex from '@ember/version/index';
d('@ember/version/index', emberVersionIndex);

import * as glimmerDebug from '@glimmer/debug';
d('@glimmer/debug', glimmerDebug);

import * as glimmerDestroyable from '@glimmer/destroyable';
d('@glimmer/destroyable', glimmerDestroyable);

import * as glimmerEncoder from '@glimmer/encoder';
d('@glimmer/encoder', glimmerEncoder);

import * as glimmerEnv from '@glimmer/env';
d('@glimmer/env', glimmerEnv);

import * as glimmerGlobalContext from '@glimmer/global-context';
d('@glimmer/global-context', glimmerGlobalContext);

import * as glimmerManager from '@glimmer/manager';
d('@glimmer/manager', glimmerManager);

import * as glimmerNode from '@glimmer/node';
d('@glimmer/node', glimmerNode);

import * as glimmerOpcodeCompiler from '@glimmer/opcode-compiler';
d('@glimmer/opcode-compiler', glimmerOpcodeCompiler);

import * as glimmerOwner from '@glimmer/owner';
d('@glimmer/owner', glimmerOwner);

import * as glimmerProgram from '@glimmer/program';
d('@glimmer/program', glimmerProgram);

import * as glimmerReference from '@glimmer/reference';
d('@glimmer/reference', glimmerReference);

import * as glimmerRuntime from '@glimmer/runtime';
d('@glimmer/runtime', glimmerRuntime);

import * as glimmerTrackingIndex from '@glimmer/tracking/index';
d('@glimmer/tracking/index', glimmerTrackingIndex);

import * as glimmerTrackingPrimitivesCache from '@glimmer/tracking/primitives/cache';
d('@glimmer/tracking/primitives/cache', glimmerTrackingPrimitivesCache);

import * as glimmerUtil from '@glimmer/util';
d('@glimmer/util', glimmerUtil);

import * as glimmerValidator from '@glimmer/validator';
d('@glimmer/validator', glimmerValidator);

import * as glimmerVm from '@glimmer/vm';
d('@glimmer/vm', glimmerVm);

import * as glimmerWireFormat from '@glimmer/wire-format';
d('@glimmer/wire-format', glimmerWireFormat);

import * as simpleDomDocument from '@simple-dom/document';
d('@simple-dom/document', simpleDomDocument);

import * as backburnerjs from 'backburner.js';
d('backburner.js', backburnerjs);

import * as dagMap from 'dag-map';
d('dag-map', dagMap);

import * as emberIndex from 'ember/index';
d('ember/index', emberIndex);

import * as emberVersion from 'ember/version';
d('ember/version', emberVersion);

import * as routeRecognizer from 'route-recognizer';
d('route-recognizer', routeRecognizer);

import * as routerJs from 'router_js';
d('router_js', routerJs);

import * as rsvp from 'rsvp';
d('rsvp', rsvp);

if (typeof module === 'object' && typeof module.require === 'function') {
  module.exports = emberIndex.default;
}
