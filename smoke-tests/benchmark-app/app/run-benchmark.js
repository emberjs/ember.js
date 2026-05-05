const ButtonSelectors = {
  Create1000: '#run',
  Create10000: '#runlots',
  Append1000: '#add',
  UpdateEvery10th: '#update',
  SelectFirstRow: 'tr:nth-child(1) a[data-test-select]',
  SelectSecondRow: 'tr:nth-child(2) a[data-test-select]',
  RemoveFirstRow: 'tr:nth-child(1) a[data-test-remove]',
  RemoveSecondRow: 'tr:nth-child(2) a[data-test-remove]',
  Clear: '#clear',
  SwapRows: '#swaprows',
}

export function emitDomClickEvent(selector) {
  const button = document.querySelector(selector);
  if (button) {
    button.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
  } else {
    throw new Error(`Could not find element with selector ${selector}`);
  }
}


export function waitForIdle() {
  return new Promise((resolve) => {
    requestIdleCallback(resolve);
  });
}

/**
 * After heavy DOM operations (e.g. rendering/clearing 5000 items), Chrome's
 * internal trace-writer thread may fall behind. requestIdleCallback only waits
 * for the *main* thread to be idle — the trace-writer is a separate thread.
 * This explicit delay gives the trace writer time to flush its buffer so that
 * subsequent performance.mark() events are not lost to packet drops.
 */
export function waitForTraceFlush() {
  return new Promise((resolve) => {
    requestIdleCallback(() => {
      setTimeout(resolve, 100);
    });
  });
}


export function enforcePaintEvent() {
  const docElem = document.documentElement;
  const refNode = docElem.firstElementChild || docElem.firstChild;
  const fakeBody = document.createElement('body');
  const div = document.createElement('div');

  div.id = 'mq-test-1';
  div.style.cssText = 'position:absolute;top:-100em';
  fakeBody.style.background = 'none';
  fakeBody.appendChild(div);
  div.innerHTML = '&shy;<style> #mq-test-1 { width: 42px; }</style>';
  docElem.insertBefore(fakeBody, refNode);

  try {
    return div.offsetWidth === 42;
  } finally {
    fakeBody.removeChild(div);
    docElem.removeChild(fakeBody);
  }
}

const TBODY_SELECTOR = 'table.test-data tbody';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Benchmark assertion failed: ${message}`);
  }
}

function rowCount() {
  return document.querySelectorAll(`${TBODY_SELECTOR} tr`).length;
}

// 1-based to mirror :nth-child semantics used elsewhere in this file.
function rowAt(oneBasedIndex) {
  return document.querySelector(`${TBODY_SELECTOR} tr:nth-child(${oneBasedIndex})`);
}

function rowIdAt(oneBasedIndex) {
  const row = rowAt(oneBasedIndex);
  if (!row) return null;
  return row.querySelector('td.col-md-1').textContent;
}

function rowLabelAt(oneBasedIndex) {
  const row = rowAt(oneBasedIndex);
  if (!row) return null;
  return row.querySelector('a[data-test-select]').textContent;
}

function rowIsSelected(oneBasedIndex) {
  const row = rowAt(oneBasedIndex);
  return row ? row.classList.contains('danger') : false;
}

function selectedRowCount() {
  return document.querySelectorAll(`${TBODY_SELECTOR} tr.danger`).length;
}

function assertRowCount(expected, phase) {
  const actual = rowCount();
  assert(
    actual === expected,
    `${phase}: expected ${expected} rows, got ${actual}`
  );
}

function assertLabelSuffix(oneBasedIndex, suffix, phase) {
  const label = rowLabelAt(oneBasedIndex);
  assert(
    label !== null && label.endsWith(suffix),
    `${phase}: row ${oneBasedIndex} label ${JSON.stringify(label)} should end with ${JSON.stringify(suffix)}`
  );
}

function assertNoLabelSuffix(oneBasedIndex, suffix, phase) {
  const label = rowLabelAt(oneBasedIndex);
  assert(
    label !== null && !label.endsWith(suffix),
    `${phase}: row ${oneBasedIndex} label ${JSON.stringify(label)} should NOT end with ${JSON.stringify(suffix)}`
  );
}

/**
* This probably isn't the best way to to tie in to the renderer,
* but we don't have a way to hook into "render complete" at the moment.
*/
async function renderBenchmark() {
  let resolveRender

  await measureRender('render', 'renderStart', 'renderEnd', () => {
      requestIdleCallback(() => {
        if (!resolveRender) return;

        resolveRender();
        resolveRender = undefined;
      });

  });

  performance.measure('load', 'navigationStart', 'renderStart');

  return async (name, update, verify) => {
    console.log('measuring', name);
    await measureRender(
      name,
      name + 'Start',
      name + 'End',
      () =>
        new Promise((resolve) => {
          update();
          requestIdleCallback(resolve);
          if (verify) verify();
        }).catch(e => console.error(e))
    );
  };
}

export async function measureRender(name,startMark,endMark,render) {
  const endObserved = new Promise((resolve) => {
    new PerformanceObserver((entries, observer) => {
      if (entries.getEntriesByName(endMark, 'mark').length > 0) {
        resolve();
        observer.disconnect();
      }
    }).observe({ type: 'mark' });
  });
  performance.mark(startMark);
  await render();
  performance.mark(endMark);
  await endObserved;
  performance.measure(name, startMark, endMark);
}

export async function runBenchmark() {
  // starting app
  const app = await renderBenchmark();

  await waitForIdle();

  await app('render1000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Create1000);
  }, () => {
    assertRowCount(1000, 'render1000Items1');
  });

  await waitForIdle();

  await app('clearItems1', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  }, () => {
    assertRowCount(0, 'clearItems1');
  });

  await waitForIdle();

  await app('render1000Items2', () => {
    emitDomClickEvent(ButtonSelectors.Create1000);
  }, () => {
    assertRowCount(1000, 'render1000Items2');
  });

  await waitForIdle();

  await app('clearItems2', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  }, () => {
    assertRowCount(0, 'clearItems2');
  });

  await waitForTraceFlush();

  await app('render10000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Create10000);
  }, () => {
    assertRowCount(10000, 'render10000Items1');
  });

  await waitForTraceFlush();

  await app('clearManyItems1', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  }, () => {
    assertRowCount(0, 'clearManyItems1');
  });

  await waitForTraceFlush();

  await app('render10000Items2', () => {
    emitDomClickEvent(ButtonSelectors.Create10000);
  }, () => {
    assertRowCount(10000, 'render10000Items2');
  });

  await waitForTraceFlush();

  await app('clearManyItems2', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  }, () => {
    assertRowCount(0, 'clearManyItems2');
  });

  await waitForIdle();

  await app('render1000Items3', () => {
    emitDomClickEvent(ButtonSelectors.Create1000);
  }, () => {
    assertRowCount(1000, 'render1000Items3');
  });

  await waitForIdle();

  await app('append1000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Append1000);
  }, () => {
    assertRowCount(2000, 'append1000Items1');
  });

  await waitForIdle();

  await app('append1000Items2', () => {
    emitDomClickEvent(ButtonSelectors.Append1000);
  }, () => {
    assertRowCount(3000, 'append1000Items2');
  });

  await waitForIdle();

  await app('updateEvery10thItem1', () => {
    emitDomClickEvent(ButtonSelectors.UpdateEvery10th);
  }, () => {
    // updates rows at array index 0, 10, 20, ... (DOM 1, 11, 21, ...)
    assertRowCount(3000, 'updateEvery10thItem1');
    assertLabelSuffix(1, ' !!!', 'updateEvery10thItem1');
    assertLabelSuffix(11, ' !!!', 'updateEvery10thItem1');
    assertLabelSuffix(2991, ' !!!', 'updateEvery10thItem1');
    assertNoLabelSuffix(2, ' !!!', 'updateEvery10thItem1');
    assertNoLabelSuffix(10, ' !!!', 'updateEvery10thItem1');
  });

  await waitForIdle();

  await app('updateEvery10thItem2', () => {
    emitDomClickEvent(ButtonSelectors.UpdateEvery10th);
  }, () => {
    assertRowCount(3000, 'updateEvery10thItem2');
    assertLabelSuffix(1, ' !!! !!!', 'updateEvery10thItem2');
    assertLabelSuffix(11, ' !!! !!!', 'updateEvery10thItem2');
    assertNoLabelSuffix(2, ' !!!', 'updateEvery10thItem2');
  });

  await waitForIdle();

  await app('selectFirstRow1', () => {
    emitDomClickEvent(ButtonSelectors.SelectFirstRow);
  }, () => {
    assert(rowIsSelected(1), 'selectFirstRow1: row 1 should have class "danger"');
    assert(
      selectedRowCount() === 1,
      `selectFirstRow1: expected exactly 1 selected row, got ${selectedRowCount()}`
    );
  });

  await waitForIdle();

  await app('selectSecondRow1', () => {
    emitDomClickEvent(ButtonSelectors.SelectSecondRow);
  }, () => {
    assert(rowIsSelected(2), 'selectSecondRow1: row 2 should have class "danger"');
    assert(!rowIsSelected(1), 'selectSecondRow1: row 1 should no longer be selected');
    assert(
      selectedRowCount() === 1,
      `selectSecondRow1: expected exactly 1 selected row, got ${selectedRowCount()}`
    );
  });

  await waitForIdle();

  // Capture id of row 1 so we can confirm it's actually gone after removal.
  const preRemove1Id = rowIdAt(1);
  await app('removeFirstRow1', () => {
    emitDomClickEvent(ButtonSelectors.RemoveFirstRow);
  }, () => {
    assertRowCount(2999, 'removeFirstRow1');
    assert(
      rowIdAt(1) !== preRemove1Id,
      `removeFirstRow1: row at position 1 should no longer have id ${preRemove1Id}`
    );
  });

  await waitForIdle();

  const preRemove2Id = rowIdAt(2);
  await app('removeSecondRow1', () => {
    emitDomClickEvent(ButtonSelectors.RemoveSecondRow);
  }, () => {
    assertRowCount(2998, 'removeSecondRow1');
    assert(
      rowIdAt(2) !== preRemove2Id,
      `removeSecondRow1: row at position 2 should no longer have id ${preRemove2Id}`
    );
  });

  await waitForIdle();

  // state.swapRows swaps array indexes 1 and 998 → DOM positions 2 and 999.
  const preSwapAt2 = rowIdAt(2);
  const preSwapAt999 = rowIdAt(999);
  await app('swapRows1', () => {
    emitDomClickEvent(ButtonSelectors.SwapRows);
  }, () => {
    assert(
      rowIdAt(2) === preSwapAt999,
      `swapRows1: position 2 should now hold id ${preSwapAt999}, got ${rowIdAt(2)}`
    );
    assert(
      rowIdAt(999) === preSwapAt2,
      `swapRows1: position 999 should now hold id ${preSwapAt2}, got ${rowIdAt(999)}`
    );
  });

  await waitForIdle();

  await app('swapRows2', () => {
    emitDomClickEvent(ButtonSelectors.SwapRows);
  }, () => {
    assert(
      rowIdAt(2) === preSwapAt2,
      `swapRows2: position 2 should be restored to ${preSwapAt2}, got ${rowIdAt(2)}`
    );
    assert(
      rowIdAt(999) === preSwapAt999,
      `swapRows2: position 999 should be restored to ${preSwapAt999}, got ${rowIdAt(999)}`
    );
  });

  await waitForIdle();

  await app('clearItems4', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  }, () => {
    assertRowCount(0, 'clearItems4');
  });

  // finishing bench
  enforcePaintEvent();
}
