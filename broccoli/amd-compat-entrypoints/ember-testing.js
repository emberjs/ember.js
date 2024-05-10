/* eslint-disable */

// This file was derived from the output of the classic broccoli-based build of
// ember-testing.js. It's intended to convey exactly how the authored ES modules
// get mapped into backward-compatible AMD defines.

import d from 'amd-compat-entrypoint-definition';

import * as emberTestingIndex from 'ember-testing/index';
d('ember-testing/index', emberTestingIndex);

import * as emberTestingLibAdaptersAdapter from 'ember-testing/lib/adapters/adapter';
d('ember-testing/lib/adapters/adapter', emberTestingLibAdaptersAdapter);

import * as emberTestingLibAdaptersQunit from 'ember-testing/lib/adapters/qunit';
d('ember-testing/lib/adapters/qunit', emberTestingLibAdaptersQunit);

import * as emberTestingLibExtApplication from 'ember-testing/lib/ext/application';
d('ember-testing/lib/ext/application', emberTestingLibExtApplication);

import * as emberTestingLibExtRsvp from 'ember-testing/lib/ext/rsvp';
d('ember-testing/lib/ext/rsvp', emberTestingLibExtRsvp);

import * as emberTestingLibHelpers from 'ember-testing/lib/helpers';
d('ember-testing/lib/helpers', emberTestingLibHelpers);

import * as emberTestingLibHelpersAndThen from 'ember-testing/lib/helpers/and_then';
d('ember-testing/lib/helpers/and_then', emberTestingLibHelpersAndThen);

import * as emberTestingLibHelpersCurrentPath from 'ember-testing/lib/helpers/current_path';
d('ember-testing/lib/helpers/current_path', emberTestingLibHelpersCurrentPath);

import * as emberTestingLibHelpersCurrentRouteName from 'ember-testing/lib/helpers/current_route_name';
d('ember-testing/lib/helpers/current_route_name', () => emberTestingLibHelpersCurrentRouteName);

import * as emberTestingLibHelpersCurrentUrl from 'ember-testing/lib/helpers/current_url';
d('ember-testing/lib/helpers/current_url', emberTestingLibHelpersCurrentUrl);

import * as emberTestingLibHelpersPauseTest from 'ember-testing/lib/helpers/pause_test';
d('ember-testing/lib/helpers/pause_test', emberTestingLibHelpersPauseTest);

import * as emberTestingLibHelpersVisit from 'ember-testing/lib/helpers/visit';
d('ember-testing/lib/helpers/visit', emberTestingLibHelpersVisit);

import * as emberTestingLibHelpersWait from 'ember-testing/lib/helpers/wait';
d('ember-testing/lib/helpers/wait', emberTestingLibHelpersWait);

import * as emberTestingLibInitializers from 'ember-testing/lib/initializers';
d('ember-testing/lib/initializers', emberTestingLibInitializers);

import * as emberTestingLibPublicApi from 'ember-testing/lib/public-api';
d('ember-testing/lib/public-api', emberTestingLibPublicApi);

import * as emberTestingLibSetupForTesting from 'ember-testing/lib/setup_for_testing';
d('ember-testing/lib/setup_for_testing', emberTestingLibSetupForTesting);

import * as emberTestingLibTest from 'ember-testing/lib/test';
d('ember-testing/lib/test', emberTestingLibTest);

import * as emberTestingLibTestAdapter from 'ember-testing/lib/test/adapter';
d('ember-testing/lib/test/adapter', emberTestingLibTestAdapter);

import * as emberTestingLibTestHelpers from 'ember-testing/lib/test/helpers';
d('ember-testing/lib/test/helpers', emberTestingLibTestHelpers);

import * as emberTestingLibTestOnInjectHelpers from 'ember-testing/lib/test/on_inject_helpers';
d('ember-testing/lib/test/on_inject_helpers', emberTestingLibTestOnInjectHelpers);

import * as emberTestingLibTestPendingRequests from 'ember-testing/lib/test/pending_requests';
d('ember-testing/lib/test/pending_requests', emberTestingLibTestPendingRequests);

import * as emberTestingLibTestPromise from 'ember-testing/lib/test/promise';
d('ember-testing/lib/test/promise', emberTestingLibTestPromise);

import * as emberTestingLibTestRun from 'ember-testing/lib/test/run';
d('ember-testing/lib/test/run', emberTestingLibTestRun);

import * as emberTestingLibTestWaiters from 'ember-testing/lib/test/waiters';
d('ember-testing/lib/test/waiters', emberTestingLibTestWaiters);
