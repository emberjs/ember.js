import { registerWaiter } from "@ember/test";

const pending = 0;

declare const MyDb: {
  hasPendingTransactions(): boolean;
};


registerWaiter(() => pending !== 0);

  registerWaiter(MyDb, MyDb.hasPendingTransactions);
