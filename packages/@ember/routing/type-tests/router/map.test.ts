import Router from '@ember/routing/router';

// From inline docs
Router.map(function () {
  this.route('post', { path: '/post/:post_id' }, function () {
    this.route('edit');
    this.route('comments', { resetNamespace: true }, function () {
      this.route('new');
    });
  });

  // @ts-expect-error Invalid name
  this.route({ invalid: true });

  // @ts-expect-error Unrecognized option
  this.route('invalid', { invalid: true });

  this.mount('my-addon');
  this.mount('other-addon', { path: 'other-addon', as: 'other-addon', resetNamespace: true });

  // @ts-expect-error Invalid name
  this.mount({ invalid: true });

  // @ts-expect-error Unrecognized option
  this.mount('invalid', { invalid: true });
});
