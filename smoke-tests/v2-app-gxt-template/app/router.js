import EmberRouter from '@ember/routing/router';
import config from './config/environment.js';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {});
