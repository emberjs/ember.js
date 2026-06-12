import Application from 'ember-strict-application-resolver';

export default class App extends Application {
  modules = {
    ...import.meta.glob('./router.js', { eager: true }),
    ...import.meta.glob('./controllers/*.js', { eager: true }),
    ...import.meta.glob('./templates/*.js', { eager: true }),
  };
}
