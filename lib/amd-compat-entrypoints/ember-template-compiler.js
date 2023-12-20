/* eslint-disable */

// This file was derived from the output of the classic broccoli-based build of
// ember-template-compiler.js. It's intended to convey exactly how the authored ES modules
// get mapped into backward-compatible AMD defines.

import * as emberinternalsBrowserEnvironmentIndex from '@ember/-internals/browser-environment/index';
define('@ember/-internals/browser-environment/index', [], () =>
  emberinternalsBrowserEnvironmentIndex);

import * as emberinternalsEnvironmentIndex from '@ember/-internals/environment/index';
define('@ember/-internals/environment/index', [], () => emberinternalsEnvironmentIndex);

import * as emberinternalsUtilsIndex from '@ember/-internals/utils/index';
define('@ember/-internals/utils/index', [], () => emberinternalsUtilsIndex);

import * as emberCanaryFeaturesIndex from '@ember/canary-features/index';
define('@ember/canary-features/index', [], () => emberCanaryFeaturesIndex);

import * as emberDebugContainerDebugAdapter from '@ember/debug/container-debug-adapter';
define('@ember/debug/container-debug-adapter', [], () => emberDebugContainerDebugAdapter);

import * as emberDebugDataAdapter from '@ember/debug/data-adapter';
define('@ember/debug/data-adapter', [], () => emberDebugDataAdapter);

import * as emberDebugIndex from '@ember/debug/index';
define('@ember/debug/index', [], () => emberDebugIndex);

import * as emberDebugLibCaptureRenderTree from '@ember/debug/lib/capture-render-tree';
define('@ember/debug/lib/capture-render-tree', [], () => emberDebugLibCaptureRenderTree);

import * as emberDebugLibDeprecate from '@ember/debug/lib/deprecate';
define('@ember/debug/lib/deprecate', [], () => emberDebugLibDeprecate);

import * as emberDebugLibHandlers from '@ember/debug/lib/handlers';
define('@ember/debug/lib/handlers', [], () => emberDebugLibHandlers);

import * as emberDebugLibInspect from '@ember/debug/lib/inspect';
define('@ember/debug/lib/inspect', [], () => emberDebugLibInspect);

import * as emberDebugLibTesting from '@ember/debug/lib/testing';
define('@ember/debug/lib/testing', [], () => emberDebugLibTesting);

import * as emberDebugLibWarn from '@ember/debug/lib/warn';
define('@ember/debug/lib/warn', [], () => emberDebugLibWarn);

import * as emberDeprecatedFeaturesIndex from '@ember/deprecated-features/index';
define('@ember/deprecated-features/index', [], () => emberDeprecatedFeaturesIndex);

import * as glimmerCompiler from '@glimmer/compiler';
define('@glimmer/compiler', [], () => glimmerCompiler);

import * as glimmerEnv from '@glimmer/env';
define('@glimmer/env', [], () => glimmerEnv);

import * as glimmerSyntax from '@glimmer/syntax';
define('@glimmer/syntax', [], () => glimmerSyntax);

import * as glimmerUtil from '@glimmer/util';
define('@glimmer/util', [], () => glimmerUtil);

import * as glimmerVm from '@glimmer/vm';
define('@glimmer/vm', [], () => glimmerVm);

import * as glimmerWireFormat from '@glimmer/wire-format';
define('@glimmer/wire-format', [], () => glimmerWireFormat);

import * as handlebarsParserIndex from '@handlebars/parser';
define('@handlebars/parser/index', [], () => handlebarsParserIndex);

import * as emberTemplateCompilerIndex from 'ember-template-compiler/index';
define('ember-template-compiler/index', [], () => emberTemplateCompilerIndex);

import * as emberTemplateCompilerLibPluginsAssertAgainstAttrs from 'ember-template-compiler/lib/plugins/assert-against-attrs';
define(
  'ember-template-compiler/lib/plugins/assert-against-attrs',
  () => emberTemplateCompilerLibPluginsAssertAgainstAttrs
);

import * as emberTemplateCompilerLibPluginsAssertAgainstNamedOutlets from 'ember-template-compiler/lib/plugins/assert-against-named-outlets';
define(
  'ember-template-compiler/lib/plugins/assert-against-named-outlets',
  () => emberTemplateCompilerLibPluginsAssertAgainstNamedOutlets
);

import * as emberTemplateCompilerLibPluginsAssertInputHelperWithoutBlock from 'ember-template-compiler/lib/plugins/assert-input-helper-without-block';
define(
  'ember-template-compiler/lib/plugins/assert-input-helper-without-block',
  () => emberTemplateCompilerLibPluginsAssertInputHelperWithoutBlock
);

import * as emberTemplateCompilerLibPluginsAssertReservedNamedArguments from 'ember-template-compiler/lib/plugins/assert-reserved-named-arguments';
define(
  'ember-template-compiler/lib/plugins/assert-reserved-named-arguments',
  () => emberTemplateCompilerLibPluginsAssertReservedNamedArguments
);

import * as emberTemplateCompilerLibPluginsAssertSplattributeExpression from 'ember-template-compiler/lib/plugins/assert-splattribute-expression';
define(
  'ember-template-compiler/lib/plugins/assert-splattribute-expression',
  () => emberTemplateCompilerLibPluginsAssertSplattributeExpression
);

import * as emberTemplateCompilerLibPluginsIndex from 'ember-template-compiler/lib/plugins/index';
define('ember-template-compiler/lib/plugins/index', [], () => emberTemplateCompilerLibPluginsIndex);

import * as emberTemplateCompilerLibPluginsTransformActionSyntax from 'ember-template-compiler/lib/plugins/transform-action-syntax';
define(
  'ember-template-compiler/lib/plugins/transform-action-syntax',
  () => emberTemplateCompilerLibPluginsTransformActionSyntax
);

import * as emberTemplateCompilerLibPluginsTransformEachInIntoEach from 'ember-template-compiler/lib/plugins/transform-each-in-into-each';
define(
  'ember-template-compiler/lib/plugins/transform-each-in-into-each',
  () => emberTemplateCompilerLibPluginsTransformEachInIntoEach
);

import * as emberTemplateCompilerLibPluginsTransformEachTrackArray from 'ember-template-compiler/lib/plugins/transform-each-track-array';
define(
  'ember-template-compiler/lib/plugins/transform-each-track-array',
  () => emberTemplateCompilerLibPluginsTransformEachTrackArray
);

import * as emberTemplateCompilerLibPluginsTransformInElement from 'ember-template-compiler/lib/plugins/transform-in-element';
define(
  'ember-template-compiler/lib/plugins/transform-in-element',
  () => emberTemplateCompilerLibPluginsTransformInElement
);

import * as emberTemplateCompilerLibPluginsTransformQuotedBindingsIntoJustBindings from 'ember-template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings';
define(
  'ember-template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings',
  () => emberTemplateCompilerLibPluginsTransformQuotedBindingsIntoJustBindings
);

import * as emberTemplateCompilerLibPluginsTransformResolutions from 'ember-template-compiler/lib/plugins/transform-resolutions';
define(
  'ember-template-compiler/lib/plugins/transform-resolutions',
  () => emberTemplateCompilerLibPluginsTransformResolutions
);

import * as emberTemplateCompilerLibPluginsTransformWrapMountAndOutlet from 'ember-template-compiler/lib/plugins/transform-wrap-mount-and-outlet';
define(
  'ember-template-compiler/lib/plugins/transform-wrap-mount-and-outlet',
  () => emberTemplateCompilerLibPluginsTransformWrapMountAndOutlet
);

import * as emberTemplateCompilerLibPluginsUtils from 'ember-template-compiler/lib/plugins/utils';
define('ember-template-compiler/lib/plugins/utils', [], () => emberTemplateCompilerLibPluginsUtils);

import * as emberTemplateCompilerLibPublicApi from 'ember-template-compiler/lib/public-api';
define('ember-template-compiler/lib/public-api', [], () => emberTemplateCompilerLibPublicApi);

import * as emberTemplateCompilerLibSystemBootstrap from 'ember-template-compiler/lib/system/bootstrap';
define(
  'ember-template-compiler/lib/system/bootstrap',
  () => emberTemplateCompilerLibSystemBootstrap
);

import * as emberTemplateCompilerLibSystemCalculateLocationDisplay from 'ember-template-compiler/lib/system/calculate-location-display';
define(
  'ember-template-compiler/lib/system/calculate-location-display',
  () => emberTemplateCompilerLibSystemCalculateLocationDisplay
);

import * as emberTemplateCompilerLibSystemCompileOptions from 'ember-template-compiler/lib/system/compile-options';
define(
  'ember-template-compiler/lib/system/compile-options',
  () => emberTemplateCompilerLibSystemCompileOptions
);

import * as emberTemplateCompilerLibSystemCompile from 'ember-template-compiler/lib/system/compile';
define('ember-template-compiler/lib/system/compile', [], () =>
  emberTemplateCompilerLibSystemCompile);

import * as emberTemplateCompilerLibSystemDasherizeComponentName from 'ember-template-compiler/lib/system/dasherize-component-name';
define(
  'ember-template-compiler/lib/system/dasherize-component-name',
  () => emberTemplateCompilerLibSystemDasherizeComponentName
);

import * as emberTemplateCompilerLibSystemInitializer from 'ember-template-compiler/lib/system/initializer';
define(
  'ember-template-compiler/lib/system/initializer',
  () => emberTemplateCompilerLibSystemInitializer
);

import * as emberTemplateCompilerLibSystemPrecompile from 'ember-template-compiler/lib/system/precompile';
define(
  'ember-template-compiler/lib/system/precompile',
  () => emberTemplateCompilerLibSystemPrecompile
);

import * as emberTemplateCompilerLibTypes from 'ember-template-compiler/lib/types';
define('ember-template-compiler/lib/types', [], () => emberTemplateCompilerLibTypes);

import * as emberTemplateCompilerMinimal from 'ember-template-compiler/minimal';
define('ember-template-compiler/minimal', [], () => emberTemplateCompilerMinimal);

import * as emberVersion from 'ember/version';
define('ember/version', [], () => emberVersion);

import * as simpleHtmlTokenizer from 'simple-html-tokenizer';
define('simple-html-tokenizer', [], () => simpleHtmlTokenizer);

try {
  // in the browser, the ember-template-compiler.js and ember.js bundles find each other via globalThis.require.
  require('@ember/template-compilation');
} catch (err) {
  // in node, that coordination is a no-op
  define('@ember/template-compilation', [], ['exports'], function (e) {
    e.__registerTemplateCompiler = function () {};
  });
  define(
    'ember',
    [],
    ['exports', '@ember/-internals/environment', '@ember/canary-features', 'ember/version'],
    function (e, env, fea, ver) {
      e.default = {
        ENV: env.ENV,
        FEATURES: fea.FEATURES,
        VERSION: ver.default,
      };
    }
  );
  define('@ember/-internals/glimmer', [], ['exports'], function (e) {
    e.template = undefined;
  });
  define('@ember/application', [], ['exports'], function (e) {});
}


if (typeof module === 'object' && module.exports) {
  module.exports = emberTemplateCompilerIndex;
}

