import { run } from "@ember/runloop";
import { registerWaiter } from "@ember/test";
import { promise} from "ember-testing/lib/test/promise";

const pending = 0;

declare const MyDb: {
  hasPendingTransactions(): boolean;
};


registerWaiter(() => pending !== 0);

  registerWaiter(MyDb, MyDb.hasPendingTransactions);

  promise((resolve) => {
    window.setTimeout(resolve, 500);
  });

