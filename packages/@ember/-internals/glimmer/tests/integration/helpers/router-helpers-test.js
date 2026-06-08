import { RSVP } from '@ember/-internals/runtime';
import Route from '@ember/routing/route';
import { precompileTemplate } from '@ember/template-compilation';
import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { moduleFor, ApplicationTestCase, runTask } from 'internal-test-helpers';
import {
  urlFor,
  rootUrl,
  isActive,
  isLoading,
  isTransitioningIn,
  isTransitioningOut,
} from '@ember/routing';

// Helpers are strict-mode only — they must be imported and passed via scope.
// None of these helpers are registered in the loose-mode resolver.

// ---------------------------------------------------------------------------
// {{urlFor}}
// ---------------------------------------------------------------------------

moduleFor(
  'Router helpers: {{urlFor}}',
  class extends ApplicationTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('about');
        this.route('post', { path: '/posts/:post_id' });
        this.route('search');
      });
    }

    async ['@test generates URL for a simple route'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<a id="link" href={{urlFor "about"}}>About</a>`, {
          strictMode: true,
          scope: () => ({ urlFor }),
        })
      );

      await this.visit('/');
      assert.equal(this.$('#link').attr('href'), '/about', 'generates correct href');
    }

    async ['@test generates URL for the index route'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<a id="link" href={{urlFor "index"}}>Home</a>`, {
          strictMode: true,
          scope: () => ({ urlFor }),
        })
      );

      await this.visit('/');
      assert.equal(this.$('#link').attr('href'), '/', 'generates correct href for index');
    }

    async ['@test generates URL with a dynamic segment model'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<a id="link" href={{urlFor "post" "42"}}>Post</a>`, {
          strictMode: true,
          scope: () => ({ urlFor }),
        })
      );

      await this.visit('/');
      assert.equal(this.$('#link').attr('href'), '/posts/42', 'generates correct href with model');
    }

    async ['@test generates URL with query params'](assert) {
      this.add(
        'template:search',
        precompileTemplate(
          `<a id="link" href={{urlFor "search" queryParams=(hash q="ember")}}>Search</a>`,
          { strictMode: true, scope: () => ({ urlFor }) }
        )
      );
      this.add(
        'controller:search',
        class extends Controller {
          queryParams = ['q'];
          q = null;
        }
      );

      await this.visit('/search');
      assert.equal(
        this.$('#link').attr('href'),
        '/search?q=ember',
        'generates href with query params'
      );
    }

    async ['@test returns undefined when model is null'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<span id="result">{{urlFor "post" this.model}}</span>`, {
          strictMode: true,
          scope: () => ({ urlFor }),
        })
      );
      this.add(
        'controller:index',
        class extends Controller {
          model = null;
        }
      );

      await this.visit('/');
      assert.equal(this.$('#result').text().trim(), '', 'returns empty when model is null');
    }

    async ['@test updates when model changes'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<a id="link" href={{urlFor "post" this.postId}}>Post</a>`, {
          strictMode: true,
          scope: () => ({ urlFor }),
        })
      );

      class IndexController extends Controller {
        @tracked postId = '1';
      }
      this.add('controller:index', IndexController);

      await this.visit('/');
      assert.equal(this.$('#link').attr('href'), '/posts/1', 'initial href correct');

      let controller = this.applicationInstance.lookup('controller:index');
      runTask(() => (controller.postId = '2'));
      assert.equal(this.$('#link').attr('href'), '/posts/2', 'href updates when model changes');
    }
  }
);

// ---------------------------------------------------------------------------
// {{rootUrl}}
// ---------------------------------------------------------------------------

moduleFor(
  'Router helpers: {{rootUrl}}',
  class extends ApplicationTestCase {
    async ['@test returns the default rootURL'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<span id="result">{{rootUrl}}</span>`, {
          strictMode: true,
          scope: () => ({ rootUrl }),
        })
      );

      await this.visit('/');
      assert.equal(this.$('#result').text(), '/', 'returns default rootURL of "/"');
    }
  }
);

// ---------------------------------------------------------------------------
// {{isActive}}
// ---------------------------------------------------------------------------

moduleFor(
  'Router helpers: {{isActive}}',
  class extends ApplicationTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('about');
        this.route('post', { path: '/posts/:post_id' });
        this.route('search');
      });
    }

    async ['@test returns true for the current route'](assert) {
      this.add(
        'template:index',
        precompileTemplate(
          `<span id="home-active">{{isActive "index"}}</span>
           <span id="about-active">{{isActive "about"}}</span>`,
          { strictMode: true, scope: () => ({ isActive }) }
        )
      );

      await this.visit('/');
      assert.equal(this.$('#home-active').text(), 'true', 'index is active on /');
      assert.equal(this.$('#about-active').text(), 'false', 'about is not active on /');
    }

    async ['@test updates after navigation'](assert) {
      this.add(
        'template:application',
        precompileTemplate(
          `{{outlet}}
           <span id="home-active">{{isActive "index"}}</span>
           <span id="about-active">{{isActive "about"}}</span>`,
          { strictMode: true, scope: () => ({ isActive }) }
        )
      );

      await this.visit('/');
      assert.equal(this.$('#home-active').text(), 'true', 'index active before nav');
      assert.equal(this.$('#about-active').text(), 'false', 'about inactive before nav');

      await this.visit('/about');
      assert.equal(this.$('#home-active').text(), 'false', 'index inactive after nav');
      assert.equal(this.$('#about-active').text(), 'true', 'about active after nav');
    }

    async ['@test returns false when any model is null'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<span id="result">{{isActive "post" this.model}}</span>`, {
          strictMode: true,
          scope: () => ({ isActive }),
        })
      );
      this.add(
        'controller:index',
        class extends Controller {
          model = null;
        }
      );

      await this.visit('/');
      assert.equal(this.$('#result').text(), 'false', 'false when model is null');
    }

    async ['@test works with a dynamic segment model'](assert) {
      this.add(
        'template:post',
        precompileTemplate(`<span id="result">{{isActive "post" "42"}}</span>`, {
          strictMode: true,
          scope: () => ({ isActive }),
        })
      );

      await this.visit('/posts/42');
      assert.equal(this.$('#result').text(), 'true', 'active on correct post');
    }

    async ['@test returns false for a different dynamic segment value'](assert) {
      this.add(
        'template:post',
        precompileTemplate(`<span id="result">{{isActive "post" "99"}}</span>`, {
          strictMode: true,
          scope: () => ({ isActive }),
        })
      );

      await this.visit('/posts/42');
      assert.equal(this.$('#result').text(), 'false', 'false for different model id');
    }
  }
);

// ---------------------------------------------------------------------------
// {{isLoading}}
// ---------------------------------------------------------------------------

moduleFor(
  'Router helpers: {{isLoading}}',
  class extends ApplicationTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('post', { path: '/posts/:post_id' });
      });
    }

    async ['@test returns false when all args are present'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<span id="result">{{isLoading "post" "42"}}</span>`, {
          strictMode: true,
          scope: () => ({ isLoading }),
        })
      );

      await this.visit('/');
      assert.equal(this.$('#result').text(), 'false', 'false when route and model are present');
    }

    async ['@test returns true when model is null'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<span id="result">{{isLoading "post" this.model}}</span>`, {
          strictMode: true,
          scope: () => ({ isLoading }),
        })
      );
      this.add(
        'controller:index',
        class extends Controller {
          model = null;
        }
      );

      await this.visit('/');
      assert.equal(this.$('#result').text(), 'true', 'true when model is null');
    }

    async ['@test returns true when model is undefined'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<span id="result">{{isLoading "post" this.model}}</span>`, {
          strictMode: true,
          scope: () => ({ isLoading }),
        })
      );
      this.add(
        'controller:index',
        class extends Controller {
          model = undefined;
        }
      );

      await this.visit('/');
      assert.equal(this.$('#result').text(), 'true', 'true when model is undefined');
    }

    async ['@test returns true when routeName is null'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<span id="result">{{isLoading this.route}}</span>`, {
          strictMode: true,
          scope: () => ({ isLoading }),
        })
      );
      this.add(
        'controller:index',
        class extends Controller {
          route = null;
        }
      );

      await this.visit('/');
      assert.equal(this.$('#result').text(), 'true', 'true when routeName is null');
    }

    async ['@test updates reactively when model changes'](assert) {
      this.add(
        'template:index',
        precompileTemplate(`<span id="result">{{isLoading "post" this.postId}}</span>`, {
          strictMode: true,
          scope: () => ({ isLoading }),
        })
      );

      class IndexController extends Controller {
        @tracked postId = null;
      }
      this.add('controller:index', IndexController);

      await this.visit('/');
      assert.equal(this.$('#result').text(), 'true', 'true initially (null model)');

      let controller = this.applicationInstance.lookup('controller:index');
      runTask(() => (controller.postId = '42'));
      assert.equal(this.$('#result').text(), 'false', 'false after model is set');
    }
  }
);

// ---------------------------------------------------------------------------
// {{isTransitioningIn}} and {{isTransitioningOut}}
// ---------------------------------------------------------------------------

moduleFor(
  'Router helpers: {{isTransitioningIn}} and {{isTransitioningOut}}',
  class extends ApplicationTestCase {
    constructor(...args) {
      super(...args);

      this.aboutDefer = RSVP.defer();
      let _this = this;

      this.router.map(function () {
        this.route('about');
        this.route('other');
      });

      this.add(
        'route:about',
        class extends Route {
          model() {
            return _this.aboutDefer.promise;
          }
        }
      );

      this.add(
        'template:application',
        precompileTemplate(
          `{{outlet}}
           <span id="index-in">{{isTransitioningIn "index"}}</span>
           <span id="index-out">{{isTransitioningOut "index"}}</span>
           <span id="about-in">{{isTransitioningIn "about"}}</span>
           <span id="about-out">{{isTransitioningOut "about"}}</span>`,
          { strictMode: true, scope: () => ({ isTransitioningIn, isTransitioningOut }) }
        )
      );
    }

    afterEach() {
      super.afterEach();
      this.aboutDefer = null;
    }

    async ['@test all false when no transition is in flight'](assert) {
      await this.visit('/');

      assert.equal(this.$('#index-in').text(), 'false', 'index not transitioning-in');
      assert.equal(this.$('#index-out').text(), 'false', 'index not transitioning-out');
      assert.equal(this.$('#about-in').text(), 'false', 'about not transitioning-in');
      assert.equal(this.$('#about-out').text(), 'false', 'about not transitioning-out');
    }

    ['@test correct values during a deferred transition'](assert) {
      return this.visit('/').then(() => {
        runTask(() => this.visit('/about'));

        assert.equal(this.$('#index-in').text(), 'false', 'index not transitioning-in');
        assert.equal(
          this.$('#index-out').text(),
          'true',
          'index is transitioning-out (leaving index)'
        );
        assert.equal(
          this.$('#about-in').text(),
          'true',
          'about is transitioning-in (entering about)'
        );
        assert.equal(this.$('#about-out').text(), 'false', 'about not transitioning-out');

        runTask(() => this.aboutDefer.resolve());

        assert.equal(this.$('#index-in').text(), 'false', 'index not transitioning-in after');
        assert.equal(this.$('#index-out').text(), 'false', 'index not transitioning-out after');
        assert.equal(this.$('#about-in').text(), 'false', 'about not transitioning-in after');
        assert.equal(this.$('#about-out').text(), 'false', 'about not transitioning-out after');
      });
    }
  }
);

moduleFor(
  'Router helpers: {{isTransitioningIn}} and {{isTransitioningOut}} with null models',
  class extends ApplicationTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('about');
      });

      this.add(
        'template:application',
        precompileTemplate(
          `{{outlet}}
           <span id="result-in">{{isTransitioningIn "about" this.model}}</span>
           <span id="result-out">{{isTransitioningOut "about" this.model}}</span>`,
          { strictMode: true, scope: () => ({ isTransitioningIn, isTransitioningOut }) }
        )
      );
      this.add(
        'controller:application',
        class extends Controller {
          model = null;
        }
      );
    }

    async ['@test returns false when model is null'](assert) {
      await this.visit('/');
      assert.equal(this.$('#result-in').text(), 'false', 'isTransitioningIn false with null model');
      assert.equal(
        this.$('#result-out').text(),
        'false',
        'isTransitioningOut false with null model'
      );
    }
  }
);
