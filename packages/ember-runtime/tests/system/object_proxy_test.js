module("Ember.ObjectProxy");

testBoth("should proxy properties to content", function(get, set) {
  var content = {
        firstName: 'Tom',
        lastName: 'Dale',
        unknownProperty: function (key) { return key + ' unknown';}
      },
      proxy = Ember.ObjectProxy.create();

  equal(get(proxy, 'firstName'), undefined, 'get on proxy without content should return undefined');
  raises(function () {
    set(proxy, 'firstName', 'Foo');
  }, 'set on proxy without content should raise');

  set(proxy, 'content', content);

  equal(get(proxy, 'firstName'), 'Tom', 'get on proxy with content should forward to content');
  equal(get(proxy, 'lastName'), 'Dale', 'get on proxy with content should forward to content');
  equal(get(proxy, 'foo'), 'foo unknown', 'get on proxy with content should forward to content');

  set(proxy, 'lastName', 'Huda');

  equal(get(content, 'lastName'), 'Huda', 'content should have new value from set on proxy');
  equal(get(proxy, 'lastName'), 'Huda', 'proxy should have new value from set on proxy');

  set(proxy, 'content', {firstName: 'Yehuda', lastName: 'Katz'});

  equal(get(proxy, 'firstName'), 'Yehuda', 'proxy should reflect updated content');
  equal(get(proxy, 'lastName'), 'Katz', 'proxy should reflect updated content');
});

testBoth("should work with watched properties", function(get, set) {
  var content1 = {firstName: 'Tom', lastName: 'Dale'},
    content2 = {firstName: 'Yehuda', lastName: 'Katz'},
    Proxy,
    proxy,
    count = 0,
    last;

  Proxy = Ember.ObjectProxy.extend({
    fullName: Ember.computed(function () {
      var firstName = this.get('firstName'),
          lastName = this.get('lastName');
      if (firstName && lastName) {
        return firstName + ' ' + lastName;
      }
      return firstName || lastName;
    }).property('firstName', 'lastName')
  });

  proxy = Proxy.create();

  Ember.addObserver(proxy, 'fullName', function () {
    last = get(proxy, 'fullName');
    count++;
  });

  // proxy without content returns undefined
  equal(get(proxy, 'fullName'), undefined);

  // setting content causes all watched properties to change
  set(proxy, 'content', content1);
  // both dependent keys changed
  equal(count, 2);
  equal(last, 'Tom Dale');

  // setting property in content causes proxy property to change
  set(content1, 'lastName', 'Huda');
  equal(count, 3);
  equal(last, 'Tom Huda');

  // replacing content causes all watched properties to change
  set(proxy, 'content', content2);
  // both dependent keys changed
  equal(count, 5);
  equal(last, 'Yehuda Katz');
  // content1 is no longer watched
  ok(!Ember.isWatching(content1, 'firstName'), 'not watching firstName');
  ok(!Ember.isWatching(content1, 'lastName'), 'not watching lastName');

  // setting property in new content
  set(content2, 'firstName', 'Tomhuda');
  equal(last, 'Tomhuda Katz');
  equal(count, 6);

  // setting property in proxy syncs with new content
  set(proxy, 'lastName', 'Katzdale');
  equal(count, 7);
  equal(last, 'Tomhuda Katzdale');
  equal(get(content2, 'firstName'), 'Tomhuda');
  equal(get(content2, 'lastName'), 'Katzdale');
});

test("setPath and getPath should work", function () {
  var content = {foo: {bar: 'baz'}},
      proxy = Ember.ObjectProxy.create({content: content}),
      count = 0;
  proxy.setPath('foo.bar', 'hello');
  equal(proxy.getPath('foo.bar'), 'hello');
  equal(proxy.getPath('content.foo.bar'), 'hello');

  proxy.addObserver('foo.bar', function () {
    count++;
  });

  proxy.setPath('foo.bar', 'bye');

  equal(count, 1);
  equal(proxy.getPath('foo.bar'), 'bye');
  equal(proxy.getPath('content.foo.bar'), 'bye');
});

testBoth("should transition between watched and unwatched strategies", function(get, set) {
  var content = {foo: 'foo'},
      proxy = Ember.ObjectProxy.create({content: content}),
      count = 0;

  function observer() {
    count++;
  }

  equal(get(proxy, 'foo'), 'foo');

  set(content, 'foo', 'bar');

  equal(get(proxy, 'foo'), 'bar');

  set(proxy, 'foo', 'foo');

  equal(get(content, 'foo'), 'foo');
  equal(get(proxy, 'foo'), 'foo');

  Ember.addObserver(proxy, 'foo', observer);

  equal(count, 0);
  equal(get(proxy, 'foo'), 'foo');

  set(content, 'foo', 'bar');

  equal(count, 1);
  equal(get(proxy, 'foo'), 'bar');

  set(proxy, 'foo', 'foo');

  equal(count, 2);
  equal(get(content, 'foo'), 'foo');
  equal(get(proxy, 'foo'), 'foo');

  Ember.removeObserver(proxy, 'foo', observer);

  set(content, 'foo', 'bar');

  equal(get(proxy, 'foo'), 'bar');

  set(proxy, 'foo', 'foo');

  equal(get(content, 'foo'), 'foo');
  equal(get(proxy, 'foo'), 'foo');
});

testBoth("should be able directly set properties on proxy", function(get, set) {
  var content = {},
      cpValue = false,
      proxy = Ember.ObjectProxy.create({
        cp: Ember.computed(function (key, value) {
          if (arguments.length === 1) {
            return cpValue;
          } else {
            cpValue = value;
            return value;
          }
        })
      }),
      count = 0;

  function observer() {
    count++;
  }

  proxy.proxySet('a', 'a'); // doesn't fail
  equal(get(proxy, 'a'), 'a', 'proxySet can set properties of proxy without content');

  proxy.set('content', content);
  proxy.proxySet('b', 'b');

  equal(get(proxy, 'b'), 'b', 'proxySet can set properties of proxy with content');
  equal(get(content, 'b'), undefined, 'should not affect content');

  proxy.proxySet('cp', 'foo');
  equal(cpValue, 'foo', 'proxySet can set computed properties of proxy');

  Ember.addObserver(proxy, 'watched', observer);
  proxy.proxySet('watched', 'foo');
  equal(get(proxy, 'watched'), 'foo', 'proxySet can set observed properties of proxy');
  equal(count, 1, 'triggered change');
  equal(get(content, 'watched'), undefined, 'should not affect content');

  Ember.removeObserver(proxy, 'watched', observer);
});