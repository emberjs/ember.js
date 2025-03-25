/* eslint-disable */

// This file was derived from the output of the classic broccoli-based build of
// ember-template-compiler.js. It's intended to convey exactly how the authored ES modules
// get mapped into backward-compatible AMD defines.

import d from 'amd-compat-entrypoint-definition';

import * as emberinternalsBrowserEnvironmentIndex from '@ember/-internals/browser-environment/index';
d('@ember/-internals/browser-environment/index', emberinternalsBrowserEnvironmentIndex);

import * as emberinternalsEnvironmentIndex from '@ember/-internals/environment/index';
d('@ember/-internals/environment/index', emberinternalsEnvironmentIndex);

import * as emberinternalsUtilsIndex from '@ember/-internals/utils/index';
d('@ember/-internals/utils/index', emberinternalsUtilsIndex);

import * as emberCanaryFeaturesIndex from '@ember/canary-features/index';
d('@ember/canary-features/index', emberCanaryFeaturesIndex);

/* 

The classic build included these modules but not their dependencies, so they
never worked. Keeping this comment to document why the list of modules differs in
this way.

import * as emberDebugContainerDebugAdapter from '@ember/debug/container-debug-adapter';
d('@ember/debug/container-debug-adapter',  emberDebugContainerDebugAdapter);

import * as emberDebugDataAdapter from '@ember/debug/data-adapter';
d('@ember/debug/data-adapter',  emberDebugDataAdapter);

*/

import * as emberDebugIndex from '@ember/debug/index';
d('@ember/debug/index', emberDebugIndex);

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

import * as emberDeprecatedFeaturesIndex from '@ember/deprecated-features/index';
d('@ember/deprecated-features/index', emberDeprecatedFeaturesIndex);

import * as glimmerCompiler from '@glimmer/compiler';
d('@glimmer/compiler', glimmerCompiler);

import * as glimmerEnv from '@glimmer/env';
d('@glimmer/env', glimmerEnv);

import * as glimmerSyntax from '@glimmer/syntax';
d('@glimmer/syntax', glimmerSyntax);

import * as glimmerUtil from '@glimmer/util';
d('@glimmer/util', glimmerUtil);

import * as glimmerVm from '@glimmer/vm';
d('@glimmer/vm', glimmerVm);

import * as glimmerWireFormat from '@glimmer/wire-format';
d('@glimmer/wire-format', glimmerWireFormat);

import * as handlebarsParserIndex from '@handlebars/parser';
d('@handlebars/parser/index', handlebarsParserIndex);

import * as emberTemplateCompilerIndex from 'ember-template-compiler/index';
d('ember-template-compiler/index', emberTemplateCompilerIndex);

import * as emberTemplateCompilerLibPluginsAssertAgainstAttrs from 'ember-template-compiler/lib/plugins/assert-against-attrs';
d(
  'ember-template-compiler/lib/plugins/assert-against-attrs',
  emberTemplateCompilerLibPluginsAssertAgainstAttrs
);

import * as emberTemplateCompilerLibPluginsAssertAgainstNamedOutlets from 'ember-template-compiler/lib/plugins/assert-against-named-outlets';
d(
  'ember-template-compiler/lib/plugins/assert-against-named-outlets',
  emberTemplateCompilerLibPluginsAssertAgainstNamedOutlets
);

import * as emberTemplateCompilerLibPluginsAssertInputHelperWithoutBlock from 'ember-template-compiler/lib/plugins/assert-input-helper-without-block';
d(
  'ember-template-compiler/lib/plugins/assert-input-helper-without-block',
  emberTemplateCompilerLibPluginsAssertInputHelperWithoutBlock
);

import * as emberTemplateCompilerLibPluginsAssertReservedNamedArguments from 'ember-template-compiler/lib/plugins/assert-reserved-named-arguments';
d(
  'ember-template-compiler/lib/plugins/assert-reserved-named-arguments',
  emberTemplateCompilerLibPluginsAssertReservedNamedArguments
);

import * as emberTemplateCompilerLibPluginsIndex from 'ember-template-compiler/lib/plugins/index';
d('ember-template-compiler/lib/plugins/index', emberTemplateCompilerLibPluginsIndex);

import * as emberTemplateCompilerLibPluginsTransformActionSyntax from 'ember-template-compiler/lib/plugins/transform-action-syntax';
d(
  'ember-template-compiler/lib/plugins/transform-action-syntax',
  emberTemplateCompilerLibPluginsTransformActionSyntax
);

import * as emberTemplateCompilerLibPluginsTransformEachInIntoEach from 'ember-template-compiler/lib/plugins/transform-each-in-into-each';
d(
  'ember-template-compiler/lib/plugins/transform-each-in-into-each',
  emberTemplateCompilerLibPluginsTransformEachInIntoEach
);

import * as emberTemplateCompilerLibPluginsTransformEachTrackArray from 'ember-template-compiler/lib/plugins/transform-each-track-array';
d(
  'ember-template-compiler/lib/plugins/transform-each-track-array',
  emberTemplateCompilerLibPluginsTransformEachTrackArray
);

import * as emberTemplateCompilerLibPluginsTransformInElement from 'ember-template-compiler/lib/plugins/transform-in-element';
d(
  'ember-template-compiler/lib/plugins/transform-in-element',
  emberTemplateCompilerLibPluginsTransformInElement
);

import * as emberTemplateCompilerLibPluginsTransformQuotedBindingsIntoJustBindings from 'ember-template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings';
d(
  'ember-template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings',
  emberTemplateCompilerLibPluginsTransformQuotedBindingsIntoJustBindings
);

import * as emberTemplateCompilerLibPluginsTransformResolutions from 'ember-template-compiler/lib/plugins/transform-resolutions';
d(
  'ember-template-compiler/lib/plugins/transform-resolutions',
  emberTemplateCompilerLibPluginsTransformResolutions
);

import * as emberTemplateCompilerLibPluginsTransformWrapMountAndOutlet from 'ember-template-compiler/lib/plugins/transform-wrap-mount-and-outlet';
d(
  'ember-template-compiler/lib/plugins/transform-wrap-mount-and-outlet',
  emberTemplateCompilerLibPluginsTransformWrapMountAndOutlet
);

import * as emberTemplateCompilerLibPluginsUtils from 'ember-template-compiler/lib/plugins/utils';
d('ember-template-compiler/lib/plugins/utils', emberTemplateCompilerLibPluginsUtils);

import * as emberTemplateCompilerLibPublicApi from 'ember-template-compiler/lib/public-api';
d('ember-template-compiler/lib/public-api', emberTemplateCompilerLibPublicApi);

import * as emberTemplateCompilerLibSystemBootstrap from 'ember-template-compiler/lib/system/bootstrap';
d('ember-template-compiler/lib/system/bootstrap', emberTemplateCompilerLibSystemBootstrap);

import * as emberTemplateCompilerLibSystemCalculateLocationDisplay from 'ember-template-compiler/lib/system/calculate-location-display';
d(
  'ember-template-compiler/lib/system/calculate-location-display',
  emberTemplateCompilerLibSystemCalculateLocationDisplay
);

import * as emberTemplateCompilerLibSystemCompileOptions from 'ember-template-compiler/lib/system/compile-options';
d(
  'ember-template-compiler/lib/system/compile-options',
  emberTemplateCompilerLibSystemCompileOptions
);

import * as emberTemplateCompilerLibSystemCompile from 'ember-template-compiler/lib/system/compile';
d('ember-template-compiler/lib/system/compile', emberTemplateCompilerLibSystemCompile);

import * as emberTemplateCompilerLibSystemDasherizeComponentName from 'ember-template-compiler/lib/system/dasherize-component-name';
d(
  'ember-template-compiler/lib/system/dasherize-component-name',
  emberTemplateCompilerLibSystemDasherizeComponentName
);

import * as emberTemplateCompilerLibSystemInitializer from 'ember-template-compiler/lib/system/initializer';
d('ember-template-compiler/lib/system/initializer', emberTemplateCompilerLibSystemInitializer);

import * as emberTemplateCompilerLibSystemPrecompile from 'ember-template-compiler/lib/system/precompile';
d('ember-template-compiler/lib/system/precompile', emberTemplateCompilerLibSystemPrecompile);

import * as emberTemplateCompilerLibTypes from 'ember-template-compiler/lib/types';
d('ember-template-compiler/lib/types', emberTemplateCompilerLibTypes);

import * as emberTemplateCompilerMinimal from 'ember-template-compiler/minimal';
d('ember-template-compiler/minimal', emberTemplateCompilerMinimal);

import * as emberVersion from 'ember/version';
d('ember/version', emberVersion);

import * as simpleHtmlTokenizer from 'simple-html-tokenizer';
d('simple-html-tokenizer', simpleHtmlTokenizer);

if (typeof module === 'object' && module.exports) {
  module.exports = emberTemplateCompilerIndex;
}
