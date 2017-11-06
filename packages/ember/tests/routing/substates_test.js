import { RSVP } from 'ember-runtime';
import { Route } from 'ember-routing';
import {
  moduleFor,
  ApplicationTestCase,
  AutobootApplicationTestCase } from 'internal-test-helpers';

  let counter;

  function step(expectedValue, description) {
    equal(counter, expectedValue, 'Step ' + expectedValue + ': ' + description);
    counter++;
  }

moduleFor('Loading/Error Substates', class extends ApplicationTestCase {
  constructor() {
    super();
    counter = 1;

    this.addTemplate('application', `<div id="app">{{outlet}}</div>`);
    this.addTemplate('index', 'INDEX');
  }

  getController(name) {
    return this.applicationInstance.lookup(`controller:${name}`);
  }

  get currentPath() {
    return this.getController('application').get('currentPath');
  }

  ['@test Slow promise from a child route of application enters nested loading state'](assert) {
    let turtleDeferred = RSVP.defer();

    this.router.map(function() {
      this.route('turtle');
    });

    this.add('route:application', Route.extend({
      setupController() {
        step(2, 'ApplicationRoute#setupController');
      }
    }));

    this.add('route:turtle', Route.extend({
      model() {
        step(1, 'TurtleRoute#model');
        return turtleDeferred.promise;
      }
    }));
    this.addTemplate('turtle', 'TURTLE');
    this.addTemplate('loading', 'LOADING');

    let promise = this.visit('/turtle').then(() => {
      text = this.$('#app').text();
      assert.equal(
        text,
        'TURTLE',
        `turtle template has loaded and replaced the loading template`
      );
    });

    let text = this.$('#app').text();
    assert.equal(
      text,
      'LOADING',
      `The Loading template is nested in application template's outlet`
    );

    turtleDeferred.resolve();
    return promise;
  }

  [`@test Slow promises returned from ApplicationRoute#model don't enter LoadingRoute`](assert) {
    let appDeferred = RSVP.defer();

    this.add('route:application', Route.extend({
      model() {
        return appDeferred.promise;
      }
    }));
    this.add('route:loading', Route.extend({
      setupController() {
        ok(false, `shouldn't get here`);
      }
    }));

    let promise = this.visit('/').then(() => {
      text = this.$('#app').text();

      assert.equal(text, 'INDEX', `index template has been rendered`);
    });

    let text = this.$('#app').text();

    assert.equal(text, '', `nothing has been rendered yet`);
    appDeferred.resolve();

    return promise;
  }

  [`@test Don't enter loading route unless either route or template defined`](assert) {
    let deferred = RSVP.defer();

    this.router.map(function() {
      this.route('dummy');
    });
    this.add('route:dummy', Route.extend({
      model() {
        return deferred.promise;
      }
    }));
    this.addTemplate('dummy', 'DUMMY');

    return this.visit('/').then(() => {
      let promise = this.visit('/dummy').then(() => {
        let text = this.$('#app').text();

        assert.equal(text, 'DUMMY', `dummy template has been rendered`);
      });

      assert.ok(this.currentPath !== 'loading', `
        loading state not entered
      `);
      deferred.resolve();

      return promise;
    });
  }

  ['@test Enter loading route only if loadingRoute is defined'](assert) {
    let deferred = RSVP.defer();

    this.router.map(function() {
      this.route('dummy');
    });

    this.add('route:dummy', Route.extend({
      model() {
        step(1, 'DummyRoute#model');
        return deferred.promise;
      }
    }));
    this.add('route:loading', Route.extend({
      setupController() {
        step(2, 'LoadingRoute#setupController');
      }
    }));
    this.addTemplate('dummy', 'DUMMY');

    return this.visit('/').then(() => {
      let promise = this.visit('/dummy').then(() => {
        let text = this.$('#app').text();

        assert.equal(text, 'DUMMY', `dummy template has been rendered`);
      });

      assert.equal(
        this.currentPath,
        'loading',
        `loading state entered`
      );
      deferred.resolve();

      return promise;
    });
  }

  ['@test Slow promises returned from ApplicationRoute#model enter ApplicationLoadingRoute if present'](assert) {
    let appDeferred = RSVP.defer();

    this.add('route:application', Route.extend({
      model() {
        return appDeferred.promise;
      }
    }));
    let loadingRouteEntered = false;
    this.add('route:application_loading', Route.extend({
      setupController() {
        loadingRouteEntered = true;
      }
    }));

    let promise = this.visit('/').then(() => {
      assert.equal(this.$('#app').text(), 'INDEX', 'index route loaded');
    });
    assert.ok(loadingRouteEntered, 'ApplicationLoadingRoute was entered');
    appDeferred.resolve();

    return promise;
  }

  ['@test Slow promises returned from ApplicationRoute#model enter application_loading if template present'](assert) {
    let appDeferred = RSVP.defer();

    this.addTemplate('application_loading', `
      <div id="toplevel-loading">TOPLEVEL LOADING</div>
    `);
    this.add('route:application', Route.extend({
      model() {
        return appDeferred.promise;
      }
    }));

    let promise = this.visit('/').then(() => {
      let length = this.$('#toplevel-loading').length;
      text = this.$('#app').text();

      assert.equal(
        length,
        0,
        `top-level loading view has been entirely removed from the DOM`
      );
      assert.equal(text, 'INDEX', 'index has fully rendered');
    });
    let text = this.$('#toplevel-loading').text();

    assert.equal(text, 'TOPLEVEL LOADING', 'still loading the top level');
    appDeferred.resolve();

    return promise;
  }

  ['@test Prioritized substate entry works with preserved-namespace nested routes'](assert) {
    let deferred = RSVP.defer();

    this.addTemplate('foo.bar_loading', 'FOOBAR LOADING');
    this.addTemplate('foo.bar.index', 'YAY');

    this.router.map(function() {
      this.route('foo', function() {
        this.route('bar', { path: '/bar' }, function() {
        });
      });
    });

    this.add('route:foo.bar', Route.extend({
      model() {
        return deferred.promise;
      }
    }));

    return this.visit('/').then(() => {
      let promise = this.visit('/foo/bar').then(() => {
        text = this.$('#app').text();

        assert.equal(text, 'YAY', 'foo.bar.index fully loaded');
      });
      let text = this.$('#app').text();

      assert.equal(
        text,
        'FOOBAR LOADING',
        `foo.bar_loading was entered (as opposed to something like foo/foo/bar_loading)`
      );
      deferred.resolve();

      return promise;
    });
  }

  ['@test Prioritized substate entry works with reset-namespace nested routes'](assert) {
    let deferred = RSVP.defer();

    this.addTemplate('bar_loading', 'BAR LOADING');
    this.addTemplate('bar.index', 'YAY');

    this.router.map(function() {
      this.route('foo', function() {
        this.route('bar', { path: '/bar', resetNamespace: true }, function() {
        });
      });
    });

    this.add('route:bar', Route.extend({
      model() {
        return deferred.promise;
      }
    }));

    return this.visit('/').then(() => {
      let promise = this.visit('/foo/bar').then(() => {
        text = this.$('#app').text();

        assert.equal(text, 'YAY', 'bar.index fully loaded');
      });

      let text = this.$('#app').text();

      assert.equal(
        text,
        'BAR LOADING',
        `foo.bar_loading was entered (as opposed to something likefoo/foo/bar_loading)`
      );
      deferred.resolve();

      return promise;
    });
  }

  ['@test Prioritized loading substate entry works with preserved-namespace nested routes'](assert) {
    let deferred = RSVP.defer();

    this.addTemplate('foo.bar_loading', 'FOOBAR LOADING');
    this.addTemplate('foo.bar', 'YAY');

    this.router.map(function() {
      this.route('foo', function() {
        this.route('bar');
      });
    });

    this.add('route:foo.bar', Route.extend({
      model() {
        return deferred.promise;
      }
    }));

    let promise = this.visit('/foo/bar').then(() => {
      text = this.$('#app').text();

      assert.equal(text, 'YAY', 'foo.bar has rendered');
    });
    let text = this.$('#app').text();

    assert.equal(
      text,
      'FOOBAR LOADING',
      `foo.bar_loading was entered (as opposed to something like foo/foo/bar_loading)`
    );
    deferred.resolve();

    return promise;
  }

  ['@test Prioritized error substate entry works with preserved-namespaec nested routes'](assert) {
    this.addTemplate('foo.bar_error', 'FOOBAR ERROR: {{model.msg}}');
    this.addTemplate('foo.bar', 'YAY');

    this.router.map(function() {
      this.route('foo', function() {
        this.route('bar');
      });
    });

    this.add('route:foo.bar', Route.extend({
      model() {
        return RSVP.reject({
          msg: 'did it broke?'
        });
      }
    }));

    return this.visit('/').then(() => {
      return this.visit('/foo/bar').then(() => {
        
        let text = this.$('#app').text();
        assert.equal(
          text,
          'FOOBAR ERROR: did it broke?',
          `foo.bar_error was entered (as opposed to something like foo/foo/bar_error)`
        );
      });
    });
  }
  ['@test Prioritized loading substate entry works with auto-generated index routes'](assert) {
    let deferred = RSVP.defer();
    this.addTemplate('foo.index_loading', 'FOO LOADING');
    this.addTemplate('foo.index', 'YAY');
    this.addTemplate('foo', '{{outlet}}');

    this.router.map(function() {
      this.route('foo', function() {
        this.route('bar');
      });
    });

    this.add('route:foo.index', Route.extend({
      model() {
        return deferred.promise;
      }
    }));
    this.add('route:foo', Route.extend({
      model() {
        return true;
      }
    }));

    let promise = this.visit('/foo').then(() => {
      text = this.$('#app').text();

      assert.equal(text, 'YAY', 'foo.index was rendered');
    });
    let text = this.$('#app').text();
    assert.equal(text, 'FOO LOADING', 'foo.index_loading was entered');

    deferred.resolve();

    return promise;
  }

  ['@test Prioritized error substate entry works with auto-generated index routes'](assert) {
    this.addTemplate('foo.index_error', 'FOO ERROR: {{model.msg}}');
    this.addTemplate('foo.index', 'YAY');
    this.addTemplate('foo', '{{outlet}}');

    this.router.map(function() {
      this.route('foo', function() {
        this.route('bar');
      });
    });

    this.add('route:foo.index', Route.extend({
      model() {
        return RSVP.reject({
          msg: 'did it broke?'
        });
      }
    }));
    this.add('route:foo', Route.extend({
      model() {
        return true;
      }
    }));

    return this.visit('/').then(() => {
      
      return this.visit('/foo').then(() => {
        let text = this.$('#app').text();
        
        assert.equal(
          text,
          'FOO ERROR: did it broke?',
          'foo.index_error was entered'
        );
      });
    });
  }
});

moduleFor('Loading/Error Substates - globals mode app', class extends AutobootApplicationTestCase {
  /*
   * When an exception is thrown during the initial rendering phase, the
   * `visit` promise is not resolved or rejected. This means the `applicationInstance`
   * is never torn down and tests running after this one will fail.
   *
   * It is ugly, but since this test intentionally causes an initial render
   * error, it requires globals mode to access the `applicationInstance`
   * for teardown after test completion.
   *
   * Application "globals mode" is trigged by `autoboot: true`. It doesn't
   * have anything to do with the resolver.
   *
   * We should be able to fix this by having the application eagerly stash a
   * copy of each application instance it creates. When the application is
   * destroyed, it can also destroy the instances (this is how the globals
   * mode avoid the problem).
   *
   * See: https://github.com/emberjs/ember.js/issues/15327
   */
  ['@test Rejected promises returned from ApplicationRoute transition into top-level application_error'](assert) {
    let reject = true;

    this.runTask(() => {
      this.createApplication();
      this.addTemplate('index', '<div id="app">INDEX</div>');
      this.add('route:application', Route.extend({
        init() {
          this._super(...arguments);
        },
        model() {
          if (reject) {
            return RSVP.reject({ msg: 'BAD NEWS BEARS' });
          } else {
            return {};
          }
        }
      }));

      this.addTemplate('application_error', `
        <p id="toplevel-error">TOPLEVEL ERROR: {{model.msg}}</p>
      `);
    });

    let text = this.$('#toplevel-error').text();
    assert.equal(
      text,
      'TOPLEVEL ERROR: BAD NEWS BEARS',
      'toplevel error rendered'
    );

    reject = false;

    return this.visit('/').then(() => {
      let text = this.$('#app').text();

      assert.equal(text, 'INDEX', 'the index route resolved');
    });
  }
});

moduleFor('Loading/Error Substates - nested routes', class extends ApplicationTestCase {
  constructor() {
    super();

    counter = 1;
    
    this.addTemplate('application', `<div id="app">{{outlet}}</div>`);
    this.addTemplate('index', 'INDEX');
    this.addTemplate('grandma', 'GRANDMA {{outlet}}');
    this.addTemplate('mom', 'MOM');

    this.router.map(function() {
      this.route('grandma', function() {
        this.route('mom', { resetNamespace: true }, function() {
          this.route('sally');
          this.route('this-route-throws');
        });
        this.route('puppies');
      });
      this.route('memere', { path: '/memere/:seg' }, function() {});
    });

    this.visit('/');
  }

  getController(name) {
    return this.applicationInstance.lookup(`controller:${name}`);
  }

  get currentPath() {
    return this.getController('application').get('currentPath');
  }

  ['@test ApplicationRoute#currentPath reflects loading state path'](assert) {
    let momDeferred = RSVP.defer();

    this.addTemplate('grandma.loading', 'GRANDMALOADING');

    this.add('route:mom', Route.extend({
      model() {
        return momDeferred.promise;
      }
    }));

    let promise = this.visit('/grandma/mom').then(() => {
      text = this.$('#app').text();

      assert.equal(
        text,
        'GRANDMA MOM',
        `Grandma.mom loaded text is displayed`
      );
      assert.equal(
        this.currentPath,
        'grandma.mom.index',
        `currentPath reflects final state`
      );
    });
    let text = this.$('#app').text();

    assert.equal(
      text,
      'GRANDMA GRANDMALOADING',
      `Grandma.mom loading text displayed`
    );

    assert.equal(
      this.currentPath,
      'grandma.loading',
      `currentPath reflects loading state`
    );

    momDeferred.resolve();

    return promise;
  }

  [`@test Loading actions bubble to root but don't enter substates above pivot `](assert) {
    let sallyDeferred = RSVP.defer();
    let puppiesDeferred = RSVP.defer();

    this.add('route:application', Route.extend({
      actions: {
        loading(transition, route) {
          assert.ok(true, 'loading action received on ApplicationRoute');
        }
      }
    }));

    this.add('route:mom.sally', Route.extend({
      model() {
        return sallyDeferred.promise;
      }
    }));

    this.add('route:grandma.puppies', Route.extend({
      model() {
        return puppiesDeferred.promise;
      }
    }));

    let promise = this.visit('/grandma/mom/sally');
    assert.equal(this.currentPath, 'index', 'Initial route fully loaded');

    sallyDeferred.resolve();

    promise.then(() => {
      assert.equal(this.currentPath, 'grandma.mom.sally', 'transition completed');

      let visit =  this.visit('/grandma/puppies');
      assert.equal(
        this.currentPath,
        'grandma.mom.sally',
        'still in initial state because the only loading state is above the pivot route'
      );

      return visit;
    }).then(() => {
      this.runTask(() => puppiesDeferred.resolve());

      assert.equal(this.currentPath, 'grandma.puppies', 'Finished transition');
    });

    return promise;
  }

  ['@test Default error event moves into nested route'](assert) {
    this.addTemplate('grandma.error', 'ERROR: {{model.msg}}');

    this.add('route:mom.sally', Route.extend({
      model() {
        step(1, 'MomSallyRoute#model');
        return RSVP.reject({
          msg: 'did it broke?'
        });
      },
      actions: {
        error() {
          step(2, 'MomSallyRoute#actions.error');
          return true;
        }
      }
    }));

    
    return this.visit('/grandma/mom/sally').then(() => {
      step(3, 'App finished loading');
      
      let text = this.$('#app').text();
      
      assert.equal(text, 'GRANDMA ERROR: did it broke?', 'error bubbles');
      assert.equal(this.currentPath, 'grandma.error', 'Initial route fully loaded');
    });
  }

  [`@test Non-bubbled errors that re-throw aren't swallowed`](assert) {
    this.add('route:mom.sally', Route.extend({
      model() {
        return RSVP.reject({
          msg: 'did it broke?'
        });
      },
      actions: {
        error(err) {
          // returns undefined which is falsey
          throw err;
        }
      }
    }));

    assert.throws(() => {
      this.visit('/grandma/mom/sally');
    }, (err) => err.msg === 'did it broke?', 'it broke');
  }

  [`@test Handled errors that re-throw aren't swallowed`](assert) {
    let handledError;

    this.add('route:mom.sally', Route.extend({
      model() {
        step(1, 'MomSallyRoute#model');
        return RSVP.reject({
          msg: 'did it broke?'
        });
      },
      actions: {
        error(err) {
          step(2, 'MomSallyRoute#actions.error');
          handledError = err;
          this.transitionTo('mom.this-route-throws');

          return false;
        }
      }
    }));

    this.add('route:mom.this-route-throws', Route.extend({
      model() {
        step(3, 'MomThisRouteThrows#model');
        throw handledError;
      }
    }));

    assert.throws(() => {
      this.visit('/grandma/mom/sally');
    }, (err) => err.msg  === 'did it broke?', `it broke`);
  }

  ['@test errors that are bubbled are thrown at a higher level if not handled'](assert) {
    this.add('route:mom.sally', Route.extend({
      model() {
        step(1, 'MomSallyRoute#model');
        return RSVP.reject({
          msg: 'did it broke?'
        });
      },
      actions: {
        error(err) {
          step(2, 'MomSallyRoute#actions.error');
          return true;
        }
      }
    }));

    assert.throws(() => {
      this.visit('/grandma/mom/sally');
    }, (err) => err.msg == "did it broke?", 'Correct error was thrown');
  }

  [`@test Handled errors that are thrown through rejection aren't swallowed`](assert) {
    let handledError;

    this.add('route:mom.sally', Route.extend({
      model() {
        step(1, 'MomSallyRoute#model');
        return RSVP.reject({
          msg: 'did it broke?'
        });
      },
      actions: {
        error(err) {
          step(2, 'MomSallyRoute#actions.error');
          handledError = err;
          this.transitionTo('mom.this-route-throws');

          return false;
        }
      }
    }));

    this.add('route:mom.this-route-throws', Route.extend({
      model() {
        step(3, 'MomThisRouteThrows#model');
        return RSVP.reject(handledError);
      }
    }));

    assert.throws(() => {
      this.visit('/grandma/mom/sally');
    }, (err) => err.msg === 'did it broke?', 'it broke');
  }

  ['@test Default error events move into nested route, prioritizing more specifically named error routes - NEW'](assert) {
    this.addTemplate('grandma.error', 'ERROR: {{model.msg}}');
    this.addTemplate('mom_error', 'MOM ERROR: {{model.msg}}');

    this.add('route:mom.sally', Route.extend({
      model() {
        step(1, 'MomSallyRoute#model');
        return RSVP.reject({
          msg: 'did it broke?'
        });
      },
      actions: {
        error() {
          step(2, 'MomSallyRoute#actions.error');
          return true;
        }
      }
    }));

    return this.visit('/grandma/mom/sally').then(() => {
      step(3, 'Application finished booting');
      
      assert.equal(
        this.$('#app').text(),
        'GRANDMA MOM ERROR: did it broke?',
        'the more specifically named mome error substate was entered over the other error route'
      );
      
      assert.equal(this.currentPath, 'grandma.mom_error',
        'Initial route fully loaded'
      ); 
    });
  }

  ['@test Slow promises waterfall on startup'](assert) {
    let grandmaDeferred = RSVP.defer();
    let sallyDeferred = RSVP.defer();

    this.addTemplate('loading', 'LOADING');
    this.addTemplate('mom', 'MOM {{outlet}}');
    this.addTemplate('mom.loading', 'MOMLOADING');
    this.addTemplate('mom.sally', 'SALLY');

    this.add('route:grandma', Route.extend({
      model() {
        step(1, 'GrandmaRoute#model');
        return grandmaDeferred.promise;
      }
    }));

    this.add('route:mom', Route.extend({
      model() {
        step(2, 'MomRoute#model');
        return {};
      }
    }));

    this.add('route:mom.sally', Route.extend({
      model() {
        step(3, 'SallyRoute#model');
        return sallyDeferred.promise;
      },
      setupController() {
        step(4, 'SallyRoute#setupController');
      }
    }));

    let promise = this.visit('/grandma/mom/sally').then(() => {
      text = this.$('#app').text();

      assert.equal(
        text,
        'GRANDMA MOM SALLY',
        `Sally template displayed`
      );
    });
    let text = this.$('#app').text();

    assert.equal(
      text,
      'LOADING',
      `The loading template is nested in application template's outlet`
    );

    this.runTask(() => grandmaDeferred.resolve());
    text = this.$('#app').text();

    assert.equal(
      text,
      'GRANDMA MOM MOMLOADING',
      `Mom's child loading route is displayed due to sally's slow promise`
    );

    sallyDeferred.resolve();

    return promise;
  }
  ['@test Enter child loading state of pivot route'](assert) {
    let deferred = RSVP.defer();
    this.addTemplate('grandma.loading', 'GMONEYLOADING');

    this.add('route:mom.sally', Route.extend({
      setupController() {
        step(1, 'SallyRoute#setupController');
      }
    }));

    this.add('route:grandma.puppies', Route.extend({
      model() {
        return deferred.promise;
      }
    }));

    return this.visit('/grandma/mom/sally').then(() => {
      assert.equal(
        this.currentPath,
        'grandma.mom.sally',
        'Initial route fully loaded'
      );

      let promise = this.visit('/grandma/puppies').then(() => {
        assert.equal(
          this.currentPath,
          'grandma.puppies',
          'Finished transition'
        );
      });

      assert.equal(
        this.currentPath,
        'grandma.loading',
        `in pivot route's child loading state`
      );
      deferred.resolve();

      return promise;
    });
  }

  [`@test Error events that aren't bubbled don't throw application assertions`](assert) {
    this.add('route:mom.sally', Route.extend({
      model() {
        step(1, 'MomSallyRoute#model');
        return RSVP.reject({
          msg: 'did it broke?'
        });
      },
      actions: {
        error(err) {
          step(2, 'MomSallyRoute#actions.error');
          assert.equal(err.msg, 'did it broke?', `it didn't break`);
          return false;
        }
      }
    }));

    return this.visit('/grandma/mom/sally');
  }

  ['@test Handled errors that bubble can be handled at a higher level'](assert) {
    let handledError;

    this.add('route:mom', Route.extend({
      actions: {
        error(err) {
          step(3, 'MomRoute#actions.error');
          assert.equal(
            err,
            handledError,
            `error handled and rebubbled is handleable at higher route`
          );
        }
      }
    }));

    this.add('route:mom.sally', Route.extend({
      model() {
        step(1, 'MomSallyRoute#model');
        return RSVP.reject({
          msg: 'did it broke?'
        });
      },
      actions: {
        error(err) {
          step(2, 'MomSallyRoute#actions.error');
          handledError = err;

          return true;
        }
      }
    }));

    return this.visit('/grandma/mom/sally');
  }

  ['@test Setting a query param during a slow transition should work'](assert) {
    let deferred = RSVP.defer();
    this.addTemplate('memere.loading', 'MMONEYLOADING');

    this.add('route:grandma', Route.extend({
      beforeModel: function() {
        this.transitionTo('memere', 1);
      }
    }));

    this.add('route:memere', Route.extend({
      queryParams: {
        test: { defaultValue: 1 }
      }
    }));

    this.add('route:memere.index', Route.extend({
      model() {
        return deferred.promise;
      }
    }));

    let promise = this.visit('/grandma').then(() => {
      assert.equal(
        this.currentPath,
        'memere.index',
        'Transition should be complete'
      );
    });
    let memereController = this.getController('memere');

    assert.equal(
      this.currentPath,
      'memere.loading',
      'Initial route should be loading'
    );

    memereController.set('test', 3);

    assert.equal(
      this.currentPath,
      'memere.loading',
      'Initial route should still be loading'
    );

    assert.equal(memereController.get('test'), 3,
      'Controller query param value should have changed'
    );
    deferred.resolve();

    return promise;
  }
});