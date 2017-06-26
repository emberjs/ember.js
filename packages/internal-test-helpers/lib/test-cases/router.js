import ApplicationTestCase from './application';

export default class RouterTestCase extends ApplicationTestCase {
  constructor() {
    super();

    this.router.map(function() {
      this.route('parent', { path: '/' }, function() {
        this.route('child');
        this.route('sister');
        this.route('brother');
      });
      this.route('dynamic', { path: '/dynamic/:dynamic_id' });
    });
  }

  get routerService() {
    return this.applicationInstance.lookup('service:router');
  }

  buildQueryParams(queryParams) {
    return {
      queryParams
    };
  }
}
