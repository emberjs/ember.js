import { registerHelper as helper, registerAsyncHelper as asyncHelper } from './test/helpers';
import andThen from './helpers/and_then';
import currentPath from './helpers/current_path';
import currentRouteName from './helpers/current_route_name';
import currentURL from './helpers/current_url';
import { pauseTest, resumeTest } from './helpers/pause_test';
import visit from './helpers/visit';
import wait from './helpers/wait';

asyncHelper('visit', visit);
asyncHelper('wait', wait);
asyncHelper('andThen', andThen);
asyncHelper('pauseTest', pauseTest);

helper('currentRouteName', currentRouteName);
helper('currentPath', currentPath);
helper('currentURL', currentURL);
helper('resumeTest', resumeTest);
