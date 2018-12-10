import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import { EMBER_ROUTING_ROUTER_SERVICE } from '@ember/canary-features';
import { inject as service } from '@ember/service';
import { Route } from '@ember/-internals/routing';
import { later } from '@ember/runloop';

if (EMBER_ROUTING_ROUTER_SERVICE) {
  moduleFor(
    'Router Service - events',
    class extends RouterTestCase {
      '@test initial render'(assert) {
        assert.expect(12);
        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);
              this.router.on('routeWillChange', transition => {
                assert.ok(transition);
                assert.equal(transition.from, undefined);
                assert.equal(transition.to.name, 'parent.index');
                assert.equal(transition.to.localName, 'index');
              });

              this.router.on('routeDidChange', transition => {
                assert.ok(transition);
                assert.ok(this.router.currentURL, `has URL ${this.router.currentURL}`);
                assert.equal(this.router.currentURL, '/');
                assert.ok(
                  this.router.currentRouteName,
                  `has route name ${this.router.currentRouteName}`
                );
                assert.equal(this.router.currentRouteName, 'parent.index');
                assert.equal(transition.from, undefined);
                assert.equal(transition.to.name, 'parent.index');
                assert.equal(transition.to.localName, 'index');
              });
            },
          })
        );
        return this.visit('/');
      }

      '@test subsequent visits'(assert) {
        assert.expect(24);
        let toParent = true;

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);
              this.router.on('routeWillChange', transition => {
                if (toParent) {
                  assert.equal(this.router.currentURL, null, 'starts as null');
                  assert.equal(transition.from, undefined);
                  assert.equal(transition.to.name, 'parent.child');
                  assert.equal(transition.to.localName, 'child');
                  assert.equal(transition.to.parent.name, 'parent', 'parent node');
                  assert.equal(
                    transition.to.parent.child,
                    transition.to,
                    'parents child node is the `to`'
                  );
                  assert.equal(transition.to.parent.parent.name, 'application', 'top level');
                  assert.equal(transition.to.parent.parent.parent, null, 'top level');
                } else {
                  assert.equal(this.router.currentURL, '/child', 'not changed until transition');
                  assert.notEqual(transition.from, undefined);
                  assert.equal(transition.from.name, 'parent.child');
                  assert.equal(transition.from.localName, 'child');
                  assert.equal(transition.to.localName, 'sister');
                  assert.equal(transition.to.name, 'parent.sister');
                }
              });

              this.router.on('routeDidChange', transition => {
                if (toParent) {
                  assert.equal(this.router.currentURL, '/child');
                  assert.equal(transition.from, undefined);
                  assert.equal(transition.to.name, 'parent.child');
                  assert.equal(transition.to.localName, 'child');
                } else {
                  assert.equal(this.router.currentURL, '/sister');
                  assert.notEqual(transition.from, undefined);
                  assert.equal(transition.from.name, 'parent.child');
                  assert.equal(transition.from.localName, 'child');
                  assert.equal(transition.to.localName, 'sister');
                  assert.equal(transition.to.name, 'parent.sister');
                }
              });
            },
          })
        );
        return this.visit('/child').then(() => {
          toParent = false;
          return this.routerService.transitionTo('parent.sister');
        });
      }

      '@test transitions can be retried async'(assert) {
        let done = assert.async();
        this.add(
          `route:parent.child`,
          Route.extend({
            actions: {
              willTransition(transition) {
                transition.abort();
                this.intermediateTransitionTo('parent.sister');
                later(() => {
                  transition.retry();
                  done();
                }, 500);
              },
            },
          })
        );

        return this.visit('/child')
          .then(() => {
            return this.visit('/');
          })
          .catch(e => {
            assert.equal(e.message, 'TransitionAborted');
          });
      }

      '@test redirection with `transitionTo`'(assert) {
        assert.expect(8);
        let toChild = false;
        let toSister = false;

        this.add(
          `route:parent`,
          Route.extend({
            model() {
              this.transitionTo('parent.child');
            },
          })
        );

        this.add(
          `route:parent.child`,
          Route.extend({
            model() {
              this.transitionTo('parent.sister');
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                assert.equal(transition.from, undefined, 'initial');
                if (toChild) {
                  if (toSister) {
                    assert.equal(transition.to.name, 'parent.sister', 'going to /sister');
                  } else {
                    assert.equal(transition.to.name, 'parent.child', 'going to /child');
                    toSister = true;
                  }
                } else {
                  // Going to `/`
                  assert.equal(transition.to.name, 'parent.index', 'going to /');
                  toChild = true;
                }
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.from, undefined, 'initial');
                assert.equal(transition.to.name, 'parent.sister', 'landed on /sister');
              });
            },
          })
        );
        return this.visit('/');
      }

      '@test redirection with `replaceWith`'(assert) {
        assert.expect(8);
        let toChild = false;
        let toSister = false;

        this.add(
          `route:parent`,
          Route.extend({
            model() {
              this.replaceWith('parent.child');
            },
          })
        );

        this.add(
          `route:parent.child`,
          Route.extend({
            model() {
              this.replaceWith('parent.sister');
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                assert.equal(transition.from, undefined, 'initial');
                if (toChild) {
                  if (toSister) {
                    assert.equal(transition.to.name, 'parent.sister', 'going to /sister');
                  } else {
                    assert.equal(transition.to.name, 'parent.child', 'going to /child');
                    toSister = true;
                  }
                } else {
                  // Going to `/`
                  assert.equal(transition.to.name, 'parent.index', 'going to /');
                  toChild = true;
                }
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.from, undefined, 'initial');
                assert.equal(transition.to.name, 'parent.sister', 'landed on /sister');
              });
            },
          })
        );
        return this.visit('/');
      }

      '@test nested redirection with `transitionTo`'(assert) {
        assert.expect(11);
        let toChild = false;
        let toSister = false;

        this.add(
          `route:parent.child`,
          Route.extend({
            model() {
              this.transitionTo('parent.sister');
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                if (toChild) {
                  assert.equal(transition.from.name, 'parent.index');
                  if (toSister) {
                    assert.equal(transition.to.name, 'parent.sister', 'going to /sister');
                  } else {
                    assert.equal(transition.to.name, 'parent.child', 'going to /child');
                    toSister = true;
                  }
                } else {
                  // Going to `/`
                  assert.equal(transition.to.name, 'parent.index', 'going to /');
                  assert.equal(transition.from, undefined, 'initial');
                }
              });

              this.router.on('routeDidChange', transition => {
                if (toSister) {
                  assert.equal(transition.from.name, 'parent.index', 'initial');
                  assert.equal(transition.to.name, 'parent.sister', 'landed on /sister');
                } else {
                  assert.equal(transition.from, undefined, 'initial');
                  assert.equal(transition.to.name, 'parent.index', 'landed on /');
                }
              });
            },
          })
        );
        return this.visit('/').then(() => {
          toChild = true;
          return this.routerService.transitionTo('/child').catch(e => {
            assert.equal(e.name, 'TransitionAborted', 'Transition aborted');
          });
        });
      }

      '@test nested redirection with `replaceWith`'(assert) {
        assert.expect(11);
        let toChild = false;
        let toSister = false;

        this.add(
          `route:parent.child`,
          Route.extend({
            model() {
              this.replaceWith('parent.sister');
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                if (toChild) {
                  assert.equal(transition.from.name, 'parent.index');
                  if (toSister) {
                    assert.equal(transition.to.name, 'parent.sister', 'going to /sister');
                  } else {
                    assert.equal(transition.to.name, 'parent.child', 'going to /child');
                    toSister = true;
                  }
                } else {
                  // Going to `/`
                  assert.equal(transition.to.name, 'parent.index', 'going to /');
                  assert.equal(transition.from, undefined, 'initial');
                }
              });

              this.router.on('routeDidChange', transition => {
                if (toSister) {
                  assert.equal(transition.from.name, 'parent.index', 'initial');
                  assert.equal(transition.to.name, 'parent.sister', 'landed on /sister');
                } else {
                  assert.equal(transition.from, undefined, 'initial');
                  assert.equal(transition.to.name, 'parent.index', 'landed on /');
                }
              });
            },
          })
        );
        return this.visit('/').then(() => {
          toChild = true;
          return this.routerService.transitionTo('/child').catch(e => {
            assert.equal(e.name, 'TransitionAborted', 'Transition aborted');
          });
        });
      }

      '@test aborted transition'(assert) {
        assert.expect(11);
        let didAbort = false;
        let toChild = false;

        this.add(
          `route:parent.child`,
          Route.extend({
            model(_model, transition) {
              didAbort = true;
              transition.abort();
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                if (didAbort) {
                  assert.equal(transition.to.name, 'parent.index', 'transition aborted');
                  assert.equal(transition.from.name, 'parent.index', 'transition aborted');
                } else if (toChild) {
                  assert.equal(transition.from.name, 'parent.index', 'from /');
                  assert.equal(transition.to.name, 'parent.child', 'to /child');
                } else {
                  assert.equal(transition.to.name, 'parent.index', 'going to /');
                  assert.equal(transition.from, undefined, 'initial');
                }
              });

              this.router.on('routeDidChange', transition => {
                if (didAbort) {
                  assert.equal(transition.to.name, 'parent.index', 'landed on /');
                  assert.equal(transition.from.name, 'parent.index', 'initial');
                } else {
                  assert.equal(transition.to.name, 'parent.index', 'transition aborted');
                  assert.equal(transition.from, undefined, 'transition aborted');
                }
              });
            },
          })
        );
        return this.visit('/').then(() => {
          toChild = true;
          return this.routerService.transitionTo('/child').catch(e => {
            assert.equal(e.name, 'TransitionAborted', 'Transition aborted');
          });
        });
      }

      '@test query param transitions'(assert) {
        assert.expect(15);
        let initial = true;
        let addQP = false;
        let removeQP = false;

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                assert.equal(transition.to.name, 'parent.index');
                if (initial) {
                  assert.equal(transition.from, null);
                  assert.deepEqual(transition.to.queryParams, { a: 'true' });
                } else if (addQP) {
                  assert.deepEqual(transition.from.queryParams, { a: 'true' });
                  assert.deepEqual(transition.to.queryParams, { a: 'false', b: 'b' });
                } else if (removeQP) {
                  assert.deepEqual(transition.from.queryParams, { a: 'false', b: 'b' });
                  assert.deepEqual(transition.to.queryParams, { a: 'false' });
                } else {
                  assert.ok(false, 'never');
                }
              });

              this.router.on('routeDidChange', transition => {
                if (initial) {
                  assert.equal(transition.from, null);
                  assert.deepEqual(transition.to.queryParams, { a: 'true' });
                } else if (addQP) {
                  assert.deepEqual(transition.from.queryParams, { a: 'true' });
                  assert.deepEqual(transition.to.queryParams, { a: 'false', b: 'b' });
                } else if (removeQP) {
                  assert.deepEqual(transition.from.queryParams, { a: 'false', b: 'b' });
                  assert.deepEqual(transition.to.queryParams, { a: 'false' });
                } else {
                  assert.ok(false, 'never');
                }
              });
            },
          })
        );

        return this.visit('/?a=true')
          .then(() => {
            addQP = true;
            initial = false;
            return this.routerService.transitionTo('/?a=false&b=b');
          })
          .then(() => {
            removeQP = true;
            addQP = false;
            return this.routerService.transitionTo('/?a=false');
          });
      }

      '@test query param redirects with `transitionTo`'(assert) {
        assert.expect(6);
        let toSister = false;

        this.add(
          `route:parent.child`,
          Route.extend({
            model() {
              toSister = true;
              this.transitionTo('/sister?a=a');
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                if (toSister) {
                  assert.equal(transition.to.name, 'parent.sister');
                  assert.deepEqual(transition.to.queryParams, { a: 'a' });
                } else {
                  assert.equal(transition.to.name, 'parent.child');
                  assert.deepEqual(transition.to.queryParams, {});
                }
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.to.name, 'parent.sister');
                assert.deepEqual(transition.to.queryParams, { a: 'a' });
              });
            },
          })
        );

        return this.visit('/child');
      }
      '@test query param redirects with `replaceWith`'(assert) {
        assert.expect(6);
        let toSister = false;

        this.add(
          `route:parent.child`,
          Route.extend({
            model() {
              toSister = true;
              this.replaceWith('/sister?a=a');
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                if (toSister) {
                  assert.equal(transition.to.name, 'parent.sister');
                  assert.deepEqual(transition.to.queryParams, { a: 'a' });
                } else {
                  assert.equal(transition.to.name, 'parent.child');
                  assert.deepEqual(transition.to.queryParams, {});
                }
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.to.name, 'parent.sister');
                assert.deepEqual(transition.to.queryParams, { a: 'a' });
              });
            },
          })
        );

        return this.visit('/child');
      }

      '@test params'(assert) {
        assert.expect(14);

        let inital = true;

        this.add(
          'route:dynamic',
          Route.extend({
            model(params) {
              if (inital) {
                assert.deepEqual(params, { dynamic_id: '123' });
              } else {
                assert.deepEqual(params, { dynamic_id: '1' });
              }
              return params;
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                assert.equal(transition.to.name, 'dynamic');
                if (inital) {
                  assert.deepEqual(transition.to.paramNames, ['dynamic_id']);
                  assert.deepEqual(transition.to.params, { dynamic_id: '123' });
                } else {
                  assert.deepEqual(transition.to.paramNames, ['dynamic_id']);
                  assert.deepEqual(transition.to.params, { dynamic_id: '1' });
                }
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.to.name, 'dynamic');
                assert.deepEqual(transition.to.paramNames, ['dynamic_id']);
                if (inital) {
                  assert.deepEqual(transition.to.params, { dynamic_id: '123' });
                } else {
                  assert.deepEqual(transition.to.params, { dynamic_id: '1' });
                }
              });
            },
          })
        );

        return this.visit('/dynamic/123').then(() => {
          inital = false;
          return this.routerService.transitionTo('dynamic', 1);
        });
      }

      '@test nested params'(assert) {
        assert.expect(30);
        let initial = true;

        this.add(
          'route:dynamicWithChild',
          Route.extend({
            model(params) {
              if (initial) {
                assert.deepEqual(params, { dynamic_id: '123' });
              } else {
                assert.deepEqual(params, { dynamic_id: '456' });
              }
              return params.dynamic_id;
            },
          })
        );

        this.add(
          'route:dynamicWithChild.child',
          Route.extend({
            model(params) {
              assert.deepEqual(params, { child_id: '456' });
              return params.child_id;
            },
          })
        );

        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                assert.equal(transition.to.name, 'dynamicWithChild.child');
                assert.deepEqual(transition.to.paramNames, ['child_id']);
                assert.deepEqual(transition.to.params, { child_id: '456' });
                assert.deepEqual(transition.to.parent.paramNames, ['dynamic_id']);
                if (initial) {
                  assert.deepEqual(transition.to.parent.params, { dynamic_id: '123' });
                } else {
                  assert.deepEqual(transition.from.attributes, '456');
                  assert.deepEqual(transition.from.parent.attributes, '123');
                  assert.deepEqual(transition.to.parent.params, { dynamic_id: '456' });
                }
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.to.name, 'dynamicWithChild.child');
                assert.deepEqual(transition.to.paramNames, ['child_id']);
                assert.deepEqual(transition.to.params, { child_id: '456' });
                assert.deepEqual(transition.to.parent.paramNames, ['dynamic_id']);
                if (initial) {
                  assert.deepEqual(transition.to.parent.params, { dynamic_id: '123' });
                } else {
                  assert.deepEqual(transition.from.attributes, '456');
                  assert.deepEqual(transition.from.parent.attributes, '123');
                  assert.deepEqual(transition.to.attributes, '456');
                  assert.deepEqual(transition.to.parent.attributes, '456');
                  assert.deepEqual(transition.to.parent.params, { dynamic_id: '456' });
                }
              });
            },
          })
        );

        return this.visit('/dynamic-with-child/123/456').then(() => {
          initial = false;
          return this.routerService.transitionTo('/dynamic-with-child/456/456');
        });
      }
    }
  );

  moduleFor(
    'Router Service - deprecated events',
    class extends RouterTestCase {
      '@test willTransition events are deprecated'() {
        return this.visit('/').then(() => {
          expectDeprecation(() => {
            this.routerService['_router'].on('willTransition', () => {});
          }, 'You attempted to listen to the "willTransition" event which is deprecated. Please inject the router service and listen to the "routeWillChange" event.');
        });
      }

      '@test willTransition events are deprecated on routes'() {
        this.add(
          'route:application',
          Route.extend({
            init() {
              this._super(...arguments);
              this.on('willTransition', () => {});
            },
          })
        );
        expectDeprecation(() => {
          return this.visit('/');
        }, 'You attempted to listen to the "willTransition" event which is deprecated. Please inject the router service and listen to the "routeWillChange" event.');
      }

      '@test didTransition events are deprecated on routes'() {
        this.add(
          'route:application',
          Route.extend({
            init() {
              this._super(...arguments);
              this.on('didTransition', () => {});
            },
          })
        );
        expectDeprecation(() => {
          return this.visit('/');
        }, 'You attempted to listen to the "didTransition" event which is deprecated. Please inject the router service and listen to the "routeDidChange" event.');
      }

      '@test other events are not deprecated on routes'() {
        this.add(
          'route:application',
          Route.extend({
            init() {
              this._super(...arguments);
              this.on('fixx', () => {});
            },
          })
        );
        expectNoDeprecation(() => {
          return this.visit('/');
        });
      }

      '@test didTransition events are deprecated'() {
        return this.visit('/').then(() => {
          expectDeprecation(() => {
            this.routerService['_router'].on('didTransition', () => {});
          }, 'You attempted to listen to the "didTransition" event which is deprecated. Please inject the router service and listen to the "routeDidChange" event.');
        });
      }

      '@test other events are not deprecated'() {
        return this.visit('/').then(() => {
          expectNoDeprecation(() => {
            this.routerService['_router'].on('wat', () => {});
          });
        });
      }
    }
  );

  moduleFor(
    'Router Service: deprecated willTransition hook',
    class extends RouterTestCase {
      get routerOptions() {
        return {
          willTransition() {
            this._super(...arguments);
            // Overrides
          },
        };
      }

      '@test willTransition hook is deprecated'() {
        expectDeprecation(() => {
          return this.visit('/');
        }, 'You attempted to override the "willTransition" method which is deprecated. Please inject the router service and listen to the "routeWillChange" event.');
      }
    }
  );
  moduleFor(
    'Router Service: deprecated didTransition hook',
    class extends RouterTestCase {
      get routerOptions() {
        return {
          didTransition() {
            this._super(...arguments);
            // Overrides
          },
        };
      }

      '@test didTransition hook is deprecated'() {
        expectDeprecation(() => {
          return this.visit('/');
        }, 'You attempted to override the "didTransition" method which is deprecated. Please inject the router service and listen to the "routeDidChange" event.');
      }
    }
  );
}
