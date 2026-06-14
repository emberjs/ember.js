import Application from 'ember-strict-application-resolver';

export default class App extends Application {
  modules = {
    ...import.meta.glob('./router.js', { eager: true }),
    ...import.meta.glob('./controllers/*.js', { eager: true }),
    ...import.meta.glob('./templates/*.js', { eager: true }),
    // Build-time-compiled .gjs components (the @lifeart/gxt/compiler vite
    // plugin turns <template> into GXT render trees at build time).
    ...import.meta.glob('./components/*.gjs', { eager: true }),
  };
}
