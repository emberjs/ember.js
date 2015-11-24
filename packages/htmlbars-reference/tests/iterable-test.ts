import { Reference, RootReference, UpdatableReference, ListManager, ListDelegate } from 'htmlbars-reference';
import { LITERAL, LinkedList, ListNode, InternedString, Dict, dict } from 'htmlbars-util';

QUnit.module("Reference iterables");

class Target implements ListDelegate {
  private map = dict<ListNode<RootReference>>();
  private list = new LinkedList<ListNode<RootReference>>();

  retain() {}
  done() {}

  insert(key: InternedString, item: RootReference, before: InternedString) {
    console.log("insert", key, item, before);
    let referenceNode = before ? this.map[<string>before] : null;
    let node = this.map[<string>key] = new ListNode(item);
    this.list.insertBefore(node, referenceNode);
  }

  move(key: InternedString, item: RootReference, before: InternedString) {
    console.log("move", key, item, before);
    let referenceNode = before ? this.map[<string>before] : null;
    let node = this.map[<string>key];
    this.list.remove(node);
    this.list.insertBefore(node, referenceNode);
  }

  delete(key: InternedString) {
    console.log("delete", key);
    let node = this.map[<string>key];
    delete this.map[<string>key];
    this.list.remove(node);
  }

  toArray() {
    return this.list.toArray().map(node => node.value);
  }
}

function toValues(target: Target): any[] {
  let refs: Reference[] = target.toArray();
  return refs.map(ref => ref.value());
}

QUnit.test("They provide a sequence of references with keys", assert => {
  let arr = [{ key: "a", name: "Yehuda" }, { key: "b", name: "Godfrey" }];
  let arrRef = new UpdatableReference(arr);
  let target = new Target();

  let manager = new ListManager(arrRef, LITERAL('key'), target);
  manager.sync();

  assert.deepEqual(toValues(target), arr);
});

QUnit.test("When re-iterated via mutation, the original references are updated", assert => {
  let arr = [{ key: "a", name: "Yehuda" }, { key: "b", name: "Godfrey" }];
  let arrRef = new UpdatableReference(arr);
  let target = new Target();

  let manager = new ListManager(arrRef, LITERAL('key'), target);
  manager.sync();
  
  let [ yehudaRef, godfreyRef ] = target.toArray();

  assert.equal(yehudaRef.value().name, "Yehuda");
  assert.equal(godfreyRef.value().name, "Godfrey");

  arr.reverse();

  manager.sync();

  assert.deepEqual(toValues(target), arr);
  assert.deepEqual(target.toArray(), [ godfreyRef, yehudaRef ]);
  
  arr.push({ key: "c", name: "Godhuda" });
  
  manager.sync();
  
  let [ , , godhudaRef ] = target.toArray();

  assert.deepEqual(toValues(target), arr);
  assert.deepEqual(target.toArray(), [ godfreyRef, yehudaRef, godhudaRef ]);
  
  arr.shift();
  
  manager.sync();
  
  assert.deepEqual(target.toArray(), [ yehudaRef, godhudaRef ]);
  assert.deepEqual(toValues(target), arr);
});

QUnit.test("When re-iterated via deep mutation, the original references are updated", assert => {
  let arr = [{ key: "a", name: "Yehuda" }, { key: "b", name: "Godfrey" }];
  let arrRef = new UpdatableReference(arr);
  let target = new Target();

  let manager = new ListManager(arrRef, LITERAL('key'), target);
  manager.sync();
  
  let [ yehudaRef, godfreyRef ] = target.toArray();

  assert.equal(yehudaRef.value().name, "Yehuda");
  assert.equal(godfreyRef.value().name, "Godfrey");

  arr[0].key = "b";
  arr[0].name = "Godfrey";
  arr[1].key = "a";
  arr[1].name = "Yehuda";

  manager.sync();

  assert.deepEqual(toValues(target), arr);
  assert.deepEqual(target.toArray(), [ godfreyRef, yehudaRef ]);
  
  arr[0].name = "Yehuda";
  arr[1].name = "Godfrey";

  manager.sync();

  assert.deepEqual(toValues(target), arr);
  assert.deepEqual(target.toArray(), [ godfreyRef, yehudaRef ]);
  
  arr.push({ key: "c", name: "Godhuda" });
  
  manager.sync();
  
  let [ , , godhudaRef ] = target.toArray();

  assert.deepEqual(toValues(target), arr);
  assert.deepEqual(target.toArray(), [ godfreyRef, yehudaRef, godhudaRef ]);
  
  arr.shift();
  
  manager.sync();
  
  assert.deepEqual(target.toArray(), [ yehudaRef, godhudaRef ]);
  assert.deepEqual(toValues(target), arr);
});

QUnit.test("When re-iterated via replacement, the original references are updated", assert => {
  let arr = [{ key: "a", name: "Yehuda" }, { key: "b", name: "Godfrey" }];
  let arrRef = new UpdatableReference(arr);
  let target = new Target();

  let manager = new ListManager(arrRef, LITERAL('key'), target);
  manager.sync();
  
  let [ yehudaRef, godfreyRef ] = target.toArray();

  assert.equal(yehudaRef.value().name, "Yehuda");
  assert.equal(godfreyRef.value().name, "Godfrey");

  arr = arr.slice();
  arr.reverse();
  arrRef.update(arr);

  manager.sync();

  assert.deepEqual(toValues(target), arr);
  assert.deepEqual(target.toArray(), [ godfreyRef, yehudaRef ]);
  
  arr = arr.slice();
  arr.push({ key: "c", name: "Godhuda" });
  arrRef.update(arr);
  
  manager.sync();
  
  let [ , , godhudaRef ] = target.toArray();

  assert.deepEqual(toValues(target), arr);
  assert.deepEqual(target.toArray(), [ godfreyRef, yehudaRef, godhudaRef ]);
  
  arr = arr.slice();
  arr.shift();
  arrRef.update(arr);
  
  manager.sync();
  
  assert.deepEqual(target.toArray(), [ yehudaRef, godhudaRef ]);
  assert.deepEqual(toValues(target), arr);
});