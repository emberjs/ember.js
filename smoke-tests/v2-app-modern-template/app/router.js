import EmberRouter from '@embroider/router';
import config from 'v2-app-modern-template/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('about');
});
