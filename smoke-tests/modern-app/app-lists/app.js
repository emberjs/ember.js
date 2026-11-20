// The lists app: one route whose template renders a list keyed by position
// (`key="@index"`) and an `{{#each-in}}` — the two list shapes that need gxt's
// item reference runtime (`@lifeart/gxt/item-references`). The compiled template
// installs it; the strict and loose apps have neither shape and must not ship
// it. boot-check.mjs (`--flavor lists`) renders the rows, updates both lists and
// checks the rows and their DOM identity.
import Application from 'ember-strict-application-resolver';

export default class App extends Application {
  modules = {
    ...import.meta.glob('./router.js', { eager: true }),
    ...import.meta.glob('./templates/*.gjs', { eager: true }),
  };
}
