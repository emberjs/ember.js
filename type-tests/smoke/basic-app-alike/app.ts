import Application from '@ember/application';
import Resolver from './ember-resolver-alike';
import loadInitializers from './ember-load-initializers-alike';
import config from './environment-alike';

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

loadInitializers(App, config.modulePrefix);
