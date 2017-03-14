import { isFeatureEnabled } from 'ember-debug';
import {
  registerHelper as helper,
  registerAsyncHelper as asyncHelper
} from './test/helpers';
import andThen from './helpers/and_then';
import click from './helpers/click';
import currentPath from './helpers/current_path';
import currentRouteName from './helpers/current_route_name';
import currentURL from './helpers/current_url';
import fillIn from './helpers/fill_in';
import find from './helpers/find';
import findWithAssert from './helpers/find_with_assert';
import keyEvent from './helpers/key_event';
import { pauseTest, resumeTest } from './helpers/pause_test';
import triggerEvent from './helpers/trigger_event';
import visit from './helpers/visit';
import wait from './helpers/wait';

asyncHelper('visit', visit);
asyncHelper('click', click);
asyncHelper('keyEvent', keyEvent);
asyncHelper('fillIn', fillIn);
asyncHelper('wait', wait);
asyncHelper('andThen', andThen);
asyncHelper('pauseTest', pauseTest);
asyncHelper('triggerEvent', triggerEvent);

helper('find', find);
helper('findWithAssert', findWithAssert);
helper('currentRouteName', currentRouteName);
helper('currentPath', currentPath);
helper('currentURL', currentURL);

if (isFeatureEnabled('ember-testing-resume-test')) {
  helper('resumeTest', resumeTest);
}
