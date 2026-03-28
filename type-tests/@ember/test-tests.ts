import { registerWaiter } from '@ember/test';

const pending = 0;
registerWaiter(() => pending !== 0);

declare const MyDb: {
  hasPendingTransactions(): boolean;
};

registerWaiter(MyDb, MyDb.hasPendingTransactions);
// @ts-expect-error
registerWaiter();
