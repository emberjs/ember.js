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
