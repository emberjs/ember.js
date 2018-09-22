import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor(
  'Deprecated HandlerInfos',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this.router.map(function() {
        this.route('parent', function() {
          this.route('child');
          this.route('sibling');
        });
      });
    }

    get routerOptions() {
      return {
        willTransition(oldHandlers, newHandlers, transition) {
          expectDeprecation(() => {
            this._routerMicrolib.currentHandlerInfos;
          }, 'You attempted to use "_routerMicrolib.currentHandlerInfos" which is a private API that will be removed.');

          expectDeprecation(() => {
            this._routerMicrolib.getHandler('parent');
          }, 'You attempted to use "_routerMicrolib.getHandler" which is a private API that will be removed.');

          oldHandlers.forEach(handler => {
            expectDeprecation(() => {
              handler.handler;
            }, 'You attempted to read "handlerInfo.handler" which is a private API that will be removed.');
          });
          newHandlers.forEach(handler => {
            expectDeprecation(() => {
              handler.handler;
            }, 'You attempted to read "handlerInfo.handler" which is a private API that will be removed.');
          });

          expectDeprecation(() => {
            transition.handlerInfos;
          }, 'You attempted to use "transition.handlerInfos" which is a private API that will be removed.');

          expectDeprecation(() => {
            transition.state.handlerInfos;
          }, 'You attempted to use "transition.state.handlerInfos" which is a private API that will be removed.');
          QUnit.assert.ok(true, 'willTransition');
        },

        didTransition(newHandlers) {
          newHandlers.forEach(handler => {
            expectDeprecation(() => {
              handler.handler;
            }, 'You attempted to read "handlerInfo.handler" which is a private API that will be removed.');
          });
          QUnit.assert.ok(true, 'didTransition');
        },
      };
    }

    '@test handlerInfos are deprecated and associated private apis'(assert) {
      let done = assert.async();
      return this.visit('/parent').then(() => {
        done();
      });
    }
  }
);
