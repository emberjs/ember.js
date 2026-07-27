import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor(
  'Router: explicitly declared index routes (GH#18608)',
  class extends ApplicationTestCase {
    async ['@test an explicitly declared index route defaults to path "/index", so the parent URL does not match'](
      assert
    ) {
      this.router.map(function () {
        this.route('secure', function () {
          this.route('cluster', { path: '/clusters/:cluster_id' }, function () {
            this.route('index');
            this.route('details');
          });
        });
      });

      await this.visit('/secure/clusters/100').then(
        () => assert.ok(false, 'expected the URL not to match'),
        (error) => assert.ok(/did not match any routes/.test(error.message), error.message)
      );
    }

    async ['@test an explicitly declared index route with path "/" matches the parent URL'](
      assert
    ) {
      this.router.map(function () {
        this.route('secure', function () {
          this.route('cluster', { path: '/clusters/:cluster_id' }, function () {
            this.route('index', { path: '/' });
            this.route('details');
          });
        });
      });

      await this.visit('/secure/clusters/100');
      assert.equal(this.appRouter.currentURL, '/secure/clusters/100');
    }
  }
);
