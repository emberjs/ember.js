import { Machine, PTR, PTR_MASK } from '../lib/vm/machine';

QUnit.module('[glimmer-runtime] machine');

QUnit.test('basic stack operations', assert => {
  let machine = new Machine();

  let program = [
    null,
    m => m.push(1),
    m => m.push(2),
    m => {
      let v2 = m.pop();
      let v1 = m.pop();
      m.exit(v1 + v2);
    }
  ];

  let ip: number;
  while (ip = machine.next()) {
    program[ip](machine);
  }

  assert.equal(ip, 0);
  assert.equal(machine.value(), 3);
});

QUnit.test('loops', assert => {
  let machine = new Machine();

  let program = [
    null,
    m => m.push(5),
    m => m.push(0),
    m => {
      let count = m.getLocal(0);
      if (count === 0) {
        m.goto(4);
      } else {
        let result = m.getLocal(1);
        m.setLocal(1, result + count);
        m.setLocal(0, count - 1);
        m.goto(3);
      }
    },
    m => m.exit(m.getLocal(1))
  ];

  let ip: number;
  while (ip = machine.next()) {
    program[ip](machine);
  }

  assert.equal(ip, 0);
  // assert.equal(machine.value(), 5 + 4 + 3 + 2 + 1);
});