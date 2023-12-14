declare module 'ember-testing/lib/adapters/qunit' {
  import Adapter from 'ember-testing/lib/adapters/adapter';
  /**
       @module ember
    */
  /**
      This class implements the methods defined by TestAdapter for the
      QUnit testing framework.

      @class QUnitAdapter
      @namespace Ember.Test
      @extends TestAdapter
      @public
    */
  interface QUnitAdapter extends Adapter {
    doneCallbacks: Array<Function>;
  }
  const QUnitAdapter: Readonly<
    Readonly<typeof import('@ember/object').default> &
      (new (
        owner?: import('@ember/owner').default | undefined
      ) => import('@ember/object').default) & {
        asyncStart(): void;
        asyncEnd(): void;
        exception(error: unknown): never;
      }
  > &
    (new (
      owner?: import('@ember/owner').default | undefined
    ) => import('@ember/object').default) & {
      init(this: QUnitAdapter): void;
      asyncStart(this: QUnitAdapter): void;
      asyncEnd(this: QUnitAdapter): void;
      exception(error: unknown): void;
    };
  export default QUnitAdapter;
}
