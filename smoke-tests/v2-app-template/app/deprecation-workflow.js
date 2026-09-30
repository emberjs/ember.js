import setupDeprecationWorkflow from 'ember-cli-deprecation-workflow';

/**
 * Docs: https://github.com/ember-cli/ember-cli-deprecation-workflow
 */
setupDeprecationWorkflow({
  /**
    false by default.
    Set this to "true" if a developer / team wants to handle their deprecations more proactively.
  */
  throwOnUnhandled: false,
  workflow: [
    /* ... handlers ... */
    /* to generate this list, run your app for a while (or run the test suite),
     * and then run in the browser console:
     *
     *    deprecationWorkflow.flushDeprecations()
     *
     * And copy the handlers here
     */
    /* example: */
    /* { handler: 'silence', matchId: 'template-action' }, */
  ],
});
