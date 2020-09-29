'use strict';
/* globals print, Ember, SimpleDOM */

let Router = Ember.Router.extend({
  location: 'none',
  rootURL: '/',
});
Router.map(function () {
  this.route('my-route', { path: '/my-route' }, function () {});
});
Ember.TEMPLATES['index'] = Ember.HTMLBars.template({
  id: null,
  block:
    '{"statements":[["text","index"]],"locals":[],"named":[],"yields":[],"blocks":[],"hasPartials":false}',
  meta: {},
});
Ember.TEMPLATES['my-route/index'] = Ember.HTMLBars.template({
  id: null,
  block:
    '{"statements":[["text","my-route"]],"locals":[],"named":[],"yields":[],"blocks":[],"hasPartials":false}',
  meta: {},
});
let App = Ember.Application.extend({
  Router: Router,
  autoboot: false,
});
let app = new App();
let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
let doc = new SimpleDOM.Document();
let options = {
  isBrowser: false,
  document: doc,
  rootElement: doc.body,
  shouldRender: true,
};
app
  .visit('/', options)
  .then(function (instance) {
    print(serializer.serialize(doc.body));
    let router = instance.lookup('router:main');
    return router.transitionTo('/my-route');
  })
  .then(function () {
    return new Ember.RSVP.Promise(function (resolve) {
      Ember.run.schedule('afterRender', resolve);
    });
  })
  .then(function () {
    print(serializer.serialize(doc.body));
  })
  .catch(function (err) {
    print(err.stack);
  });
