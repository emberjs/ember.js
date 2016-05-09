import run from 'ember-metal/run_loop';

export default function visit(app, url) {
  let router = app.__container__.lookup('router:main');
  let shouldHandleURL = false;

  app.boot().then(function() {
    router.location.setURL(url);

    if (shouldHandleURL) {
      run(app.__deprecatedInstance__, 'handleURL', url);
    }
  });

  if (app._readinessDeferrals > 0) {
    router['initialURL'] = url;
    run(app, 'advanceReadiness');
    delete router['initialURL'];
  } else {
    shouldHandleURL = true;
  }

  return app.testHelpers.wait();
}
