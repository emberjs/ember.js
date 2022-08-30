import ApplicationInstance from '@ember/application/instance';

const appInstance = ApplicationInstance.create();
appInstance.register('some:injection', class Foo {});

appInstance.register('some:injection', class Foo {}, {
  singleton: true,
});

appInstance.register('some:injection', class Foo {}, {
  instantiate: false,
});

// just check basic registration, doesn't yet have to be a template
appInstance.register('templates:foo/bar', {});

appInstance.register('some:injection', class Foo {}, {
  singleton: false,
  instantiate: true,
});

appInstance.factoryFor('router:main');
appInstance.lookup('route:basic');

appInstance.boot();

(async () => {
  await appInstance.boot();
})();
