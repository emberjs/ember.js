import EmberApplication from '@ember/application';
import ENV from './env';
import Resolver from './resolver';

export default class App extends EmberApplication {
  rootElement = ENV.rootElement;
  autoboot = ENV.autoboot;
  modulePrefix = ENV.modulePrefix;
  podModulePrefix = `${ENV.modulePrefix}/pods`;
  Resolver = Resolver;
}
