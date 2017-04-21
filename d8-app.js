var Router = Ember.Router.extend({
  location: 'none',
  rootURL: '/'
});
Router.map(function() {
  this.route('my-route', { path: '/my-route' }, function () {
  });
});
Ember.TEMPLATES['index'] = Ember.HTMLBars.template({"id":null,"block":"{\"statements\":[[\"text\",\"index\"]],\"locals\":[],\"named\":[],\"yields\":[],\"blocks\":[],\"hasPartials\":false}","meta":{}});
Ember.TEMPLATES['my-route/index'] = Ember.HTMLBars.template({"id":null,"block":"{\"statements\":[[\"text\",\"my-route\"]],\"locals\":[],\"named\":[],\"yields\":[],\"blocks\":[],\"hasPartials\":false}","meta":{}});
var App = Ember.Application.extend({
  Router: Router,
  autoboot: false
});
var app = new App();
var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
var doc = new SimpleDOM.Document();
var options = {
  isBrowser: false,
  document: doc,
  rootElement: doc.body,
  shouldRender: true
};
app.visit('/', options).then(function (instance) {
  print(serializer.serialize(doc.body));
  var router = instance.lookup('router:main');
  return router.transitionTo('/my-route');
}).then(function () {
  return new Ember.RSVP.Promise(function (resolve) {
    Ember.run.schedule('afterRender', resolve)
  });
}).then(function () {
  print(serializer.serialize(doc.body));
}).catch(function (err) {
  print(err.stack);
});
