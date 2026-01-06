import Application from 'ember-strict-application-resolver';

export default class App extends Application {
  modules = {
    ...import.meta.glob('./router.*', { eager: true }),
    ...import.meta.glob('./templates/application.*', { eager: true }),
    ...import.meta.glob('./services/state.*', { eager: true }),
  };
}
