import Application from '@ember/application';
import Resolver from 'ember-resolver';
import config from 'ember-test-app/config/environment';
import loadCompatModules from '@ember/compat-modules';

const compatModules = await loadCompatModules(import.meta.url)

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver.withModules(compatModules);
}

