import Application from '@ember/application';
import Resolver from '@ember/resolver';
import config from 'ember-test-app/config/environment';

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

