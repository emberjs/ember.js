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

import * as emberTestingIndex from 'ember-testing/index';
define('ember-testing/index', [], () => emberTestingIndex);

import * as emberTestingLibAdaptersAdapter from 'ember-testing/lib/adapters/adapter';
define('ember-testing/lib/adapters/adapter', [], () => emberTestingLibAdaptersAdapter);

import * as emberTestingLibAdaptersQunit from 'ember-testing/lib/adapters/qunit';
define('ember-testing/lib/adapters/qunit', [], () => emberTestingLibAdaptersQunit);

import * as emberTestingLibExtApplication from 'ember-testing/lib/ext/application';
define('ember-testing/lib/ext/application', [], () => emberTestingLibExtApplication);

import * as emberTestingLibExtRsvp from 'ember-testing/lib/ext/rsvp';
define('ember-testing/lib/ext/rsvp', [], () => emberTestingLibExtRsvp);

import * as emberTestingLibHelpers from 'ember-testing/lib/helpers';
define('ember-testing/lib/helpers', [], () => emberTestingLibHelpers);

import * as emberTestingLibHelpersAndThen from 'ember-testing/lib/helpers/and_then';
define('ember-testing/lib/helpers/and_then', [], () => emberTestingLibHelpersAndThen);

import * as emberTestingLibHelpersCurrentPath from 'ember-testing/lib/helpers/current_path';
define('ember-testing/lib/helpers/current_path', [], () => emberTestingLibHelpersCurrentPath);

import * as emberTestingLibHelpersCurrentRouteName from 'ember-testing/lib/helpers/current_route_name';
define('ember-testing/lib/helpers/current_route_name', [], () =>
  emberTestingLibHelpersCurrentRouteName);

import * as emberTestingLibHelpersCurrentUrl from 'ember-testing/lib/helpers/current_url';
define('ember-testing/lib/helpers/current_url', [], () => emberTestingLibHelpersCurrentUrl);

import * as emberTestingLibHelpersPauseTest from 'ember-testing/lib/helpers/pause_test';
define('ember-testing/lib/helpers/pause_test', [], () => emberTestingLibHelpersPauseTest);

import * as emberTestingLibHelpersVisit from 'ember-testing/lib/helpers/visit';
define('ember-testing/lib/helpers/visit', [], () => emberTestingLibHelpersVisit);

import * as emberTestingLibHelpersWait from 'ember-testing/lib/helpers/wait';
define('ember-testing/lib/helpers/wait', [], () => emberTestingLibHelpersWait);

import * as emberTestingLibInitializers from 'ember-testing/lib/initializers';
define('ember-testing/lib/initializers', [], () => emberTestingLibInitializers);

import * as emberTestingLibPublicApi from 'ember-testing/lib/public-api';
define('ember-testing/lib/public-api', [], () => emberTestingLibPublicApi);

import * as emberTestingLibSetupForTesting from 'ember-testing/lib/setup_for_testing';
define('ember-testing/lib/setup_for_testing', [], () => emberTestingLibSetupForTesting);

import * as emberTestingLibTest from 'ember-testing/lib/test';
define('ember-testing/lib/test', [], () => emberTestingLibTest);

import * as emberTestingLibTestAdapter from 'ember-testing/lib/test/adapter';
define('ember-testing/lib/test/adapter', [], () => emberTestingLibTestAdapter);

import * as emberTestingLibTestHelpers from 'ember-testing/lib/test/helpers';
define('ember-testing/lib/test/helpers', [], () => emberTestingLibTestHelpers);

import * as emberTestingLibTestOnInjectHelpers from 'ember-testing/lib/test/on_inject_helpers';
define('ember-testing/lib/test/on_inject_helpers', [], () => emberTestingLibTestOnInjectHelpers);

import * as emberTestingLibTestPendingRequests from 'ember-testing/lib/test/pending_requests';
define('ember-testing/lib/test/pending_requests', [], () => emberTestingLibTestPendingRequests);

import * as emberTestingLibTestPromise from 'ember-testing/lib/test/promise';
define('ember-testing/lib/test/promise', [], () => emberTestingLibTestPromise);

import * as emberTestingLibTestRun from 'ember-testing/lib/test/run';
define('ember-testing/lib/test/run', [], () => emberTestingLibTestRun);

import * as emberTestingLibTestWaiters from 'ember-testing/lib/test/waiters';
define('ember-testing/lib/test/waiters', [], () => emberTestingLibTestWaiters);
