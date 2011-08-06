// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.routes Base Tests
// ========================================================================
/*globals module test ok isObj equals expects */

var router;

SC.routes.wantsHistory = YES;

module('SC.routes setup');

test('Setup', function() {
  equals(SC.routes._didSetup, NO, 'SC.routes should not have been setup yet');
});

module('SC.routes setup', {
  
  setup: function() {
    router = SC.Object.create({
      route: function() {
        return;
      }
    });
    SC.run(function() {
      SC.routes.add('foo', router, router.route);
    });
  }
  
});

test('Setup', function() {
  equals(SC.routes._didSetup, YES, 'SC.routes should have been setup');
});

test('Initial route', function() {
  equals(SC.routes.get('location'), '', 'Initial route is an empty string');
});

module('SC.routes._Route', {
  
  setup: function() {
    router = SC.Object.create({
      route: function() {
        return;
      }
    });
  }
  
});

test('Route tree', function() {
  var r = SC.routes._Route.create(),
      abc = ['a', 'b', 'c'],
      abd = ['a', 'b', 'd'],
      abe = ['a', 'b', ':e'],
      as = ['a', '*foo'],
      a, b, c, d, e, s, p;
  
  r.add(abc, router, router.route);
  r.add(abd, router, router.route);
  r.add(abe, router, router.route);
  r.add(as, router, router.route);
  
  a = r.staticRoutes['a'];
  ok(a, 'There should be a staticRoutes tree for a');
  ok(!a.target, 'A node should not have a target');
  ok(!a.method, 'A node should not have a method');
  
  b = a.staticRoutes['b'];
  ok(b, 'There should be a staticRoutes tree for b');
  ok(!b.target, 'A node should not have a target');
  ok(!b.method, 'A node should not have a method');
  
  c = b.staticRoutes['c'];
  ok(c, 'There should be a staticRoutes tree for c');
  equals(c.target, router, 'A leaf should have a target');
  equals(c.method, router.route, 'A leaf should have a method');
  
  d = b.staticRoutes['d'];
  ok(d, 'There should be a staticRoutes tree for d');
  equals(d.target, router, 'A leaf should have a target');
  equals(d.method, router.route, 'A leaf should have a method');
  
  e = b.dynamicRoutes['e'];
  ok(e, 'There should be a dynamicRoutes tree for e');
  equals(d.target, router, 'A leaf should have a target');
  equals(d.method, router.route, 'A leaf should have a method');
  
  s = a.wildcardRoutes['foo'];
  ok(s, 'There should be a wildcardRoutes tree for a');
  
  equals(r.routeForParts(['a'], {}), null, 'routeForParts should return null for non existant routes');
  equals(r.routeForParts(['a', 'b'], {}), null, 'routeForParts should return null for non existant routes');
  equals(r.routeForParts(abc, {}), c, 'routeForParts should return the correct route for a/b/c');
  
  equals(r.routeForParts(abd, {}), d, 'routeForParts should return the correct route for a/b/d');
  
  abe[2] = 'foo';
  p = {};
  equals(r.routeForParts(abe, p), e, 'routeForParts should return the correct route for a/b/:e');
  equals(p['e'], 'foo', 'routeForParts should return the params for a/b/:e');
  
  p = {};
  equals(r.routeForParts(['a', 'double', 'double', 'toil', 'and', 'trouble'], p), s, 'routeForParts should return the correct route for a/*foo');
  equals(p.foo, 'double/double/toil/and/trouble', 'routeForParts should return the params for a/*foo');
});

module('SC.routes location', {
  
  teardown: function() {
    SC.routes.set('location', null);
  }
  
});

var routeWorks = function(route, name) {
  SC.routes.set('location', route);
  equals(SC.routes.get('location'), route, name + ' route has been set');
  
  setTimeout(function() {
    equals(SC.routes.get('location'), route, name + ' route is still the same');
    start();
  }, 300);
  
  stop();
};

test('Null route', function() {
  SC.routes.set('location', null);
  equals(SC.routes.get('location'), '', 'Null route is the empty string');
});

test('Simple route', function() {
  routeWorks('sixty-six', 'simple');
});

test('UTF-8 route', function() {
  routeWorks('éàçùß€', 'UTF-8');
});

test('Already escaped route', function() {
  routeWorks('%C3%A9%C3%A0%20%C3%A7%C3%B9%20%C3%9F%E2%82%AC', 'already escaped');
});

module('SC.routes defined routes', {
  
  setup: function() {
    router = SC.Object.create({
      params: null,
      triggered: NO,
      route: function(params) {
        this.set('params', params);
      },
      triggerRoute: function() {
        this.triggered = YES;
      }
    });
  },
  
  teardown: function() {
    SC.routes.set('location', null);
  }
  
});

test('setting location triggers function when only passed function', function() {
  var barred = false;

  SC.routes.add('bar', function(params) {
    barred = true;
  });
  SC.routes.set('location', 'bar');

  ok(barred, 'Function was called');
});

test('setting location simply triggers route', function() {
  SC.routes.add("foo", router, "triggerRoute");
  SC.routes.set('location', 'bar');
  ok(!router.triggered, "Router not triggered with nonexistent route.");
  
  SC.routes.set('location', 'foo');
  ok(router.triggered, "Router triggered.");
});

test('calling trigger() triggers current location (again)', function() {
  SC.routes.add("foo", router, "triggerRoute");
  SC.routes.set('location', 'foo');
  ok(router.triggered, "Router triggered first time.");
  router.triggered = NO;
  
  SC.routes.trigger();
  ok(router.triggered, "Router triggered (again).");
});

test('A mix of static, dynamic and wildcard route', function() {
  var didObserve = false,
      timer;
  
  timer = setTimeout(function() {
    ok(false, 'Route change was not notified within 2 seconds');
    window.start();
  }, 2000);
  
  router.addObserver('params', function() {
    if (!didObserve) {
      didObserve = true;
      same(router.get('params'), { controller: 'users', action: 'éàçùß€', id: '5', witches: 'double/double/toil/and/trouble' });
      clearTimeout(timer);
      window.start();
    }
  });
  
  SC.routes.add('foo/:controller/:action/bar/:id/*witches', router, router.route);
  SC.routes.set('location', 'foo/users/éàçùß€/bar/5/double/double/toil/and/trouble');
  
  stop();
});

test('Route with parameters defined in a string', function() {
  var didObserve = false,
      timer;
  
  timer = setTimeout(function() {
    ok(false, 'Route change was not notified within 2 seconds');
    window.start();
  }, 2000);
  
  router.addObserver('params', function() {
    if (!didObserve) {
      didObserve = true;
      same(router.get('params'), { cuisine: 'french', party: '4', url: '' });
      clearTimeout(timer);
      window.start();
    }
  });
  
  SC.routes.add('*url', router, router.route);
  SC.routes.set('location', '?cuisine=french&party=4');
  
  stop();
});

test('Route with parameters defined in a hash', function() {
  var didObserve = false,
      timer;
  
  timer = setTimeout(function() {
    ok(false, 'Route change was not notified within 2 seconds');
    window.start();
  }, 2000);
  
  router.addObserver('params', function() {
    if (!didObserve) {
      didObserve = true;
      same(router.get('params'), { cuisine: 'french', party: '4', url: '' });
      clearTimeout(timer);
      window.start();
    }
  });
  
  SC.routes.add('*url', router, router.route);
  SC.routes.set('location', { cuisine: 'french', party: '4' });
  
  stop();
});

test('A mix of everything', function() {
  var didObserve = false,
      timer;
  
  timer = setTimeout(function() {
    ok(false, 'Route change was not notified within 2 seconds');
    window.start();
  }, 2000);
  
  router.addObserver('params', function() {
    if (!didObserve) {
      didObserve = true;
      same(router.get('params'), { controller: 'users', action: 'éàçùß€', id: '5', witches: 'double/double/toil/and/trouble', cuisine: 'french', party: '4' });
      clearTimeout(timer);
      window.start();
    }
  });
  
  SC.routes.add('foo/:controller/:action/bar/:id/*witches', router, router.route);
  SC.routes.set('location', 'foo/users/éàçùß€/bar/5/double/double/toil/and/trouble?cuisine=french&party=4');
  
  stop();
});

module('SC.routes location observing', {
  
  setup: function() {
    router = SC.Object.create({
      hasBeenNotified: NO,
      route: function(params) {
        this.set('hasBeenNotified', YES);
      }
    });
  },
  
  teardown: function() {
    SC.routes.set('location', null);
  }
  
});

test('Location change', function() {
  var timer;
  
  if (!SC.routes.get('usesHistory')) {
    timer = setTimeout(function() {
      ok(false, 'Route change was not notified within 2 seconds');
      window.start();
    }, 2000);

    router.addObserver('hasBeenNotified', function() {
      equals(router.get('hasBeenNotified'), YES, 'router should have been notified');
      clearTimeout(timer);
      window.start();
    });

    SC.routes.add('foo', router, router.route);
    window.location.hash = 'foo';

    stop();
  }
});

module('_extractParametersAndRoute');

test('_extractParametersAndRoute with ? syntax', function() {
  same(SC.routes._extractParametersAndRoute({ route: 'videos/5?format=h264' }),
       { route: 'videos/5', params:'?format=h264', format: 'h264' },
       'route parameters should be correctly extracted');
  
  same(SC.routes._extractParametersAndRoute({ route: 'videos/5?format=h264&size=small' }),
       { route: 'videos/5', params:'?format=h264&size=small', format: 'h264', size: 'small' },
       'route parameters should be correctly extracted');
       
  same(SC.routes._extractParametersAndRoute({ route: 'videos/5?format=h264&size=small', format: 'ogg' }),
       { route: 'videos/5', params:'?format=ogg&size=small', format: 'ogg', size: 'small' },
       'route parameters should be extracted and overwritten');
       
  same(SC.routes._extractParametersAndRoute({ route: 'videos/5', format: 'h264', size: 'small' }),
       { route: 'videos/5', params:'?format=h264&size=small', format: 'h264', size: 'small' },
       'route should be well formatted with the given parameters');
       
  same(SC.routes._extractParametersAndRoute({ format: 'h264', size: 'small' }),
       { route: '', params:'?format=h264&size=small', format: 'h264', size: 'small' },
       'route should be well formatted with the given parameters even if there is no initial route');
});

test('_extractParametersAndRoute with & syntax', function() {
  same(SC.routes._extractParametersAndRoute({ route: 'videos/5&format=h264' }),
       { route: 'videos/5', params:'&format=h264', format: 'h264' },
       'route parameters should be correctly extracted');
       
  same(SC.routes._extractParametersAndRoute({ route: 'videos/5&format=h264&size=small' }),
       { route: 'videos/5', params:'&format=h264&size=small', format: 'h264', size: 'small' },
       'route parameters should be correctly extracted');
       
  same(SC.routes._extractParametersAndRoute({ route: 'videos/5&format=h264&size=small', format: 'ogg' }),
       { route: 'videos/5', params:'&format=ogg&size=small', format: 'ogg', size: 'small' },
       'route parameters should be extracted and overwritten');
});
