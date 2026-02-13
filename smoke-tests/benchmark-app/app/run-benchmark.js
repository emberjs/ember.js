const ButtonSelectors = {
  Create1000: '#run',
  Create5000: '#runlots',
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

  return async (name, update) => {
    console.log('measuring', name);
    await measureRender(
      name,
      name + 'Start',
      name + 'End',
      () => 
        new Promise((resolve) => {
          update();
          requestIdleCallback(resolve);
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
  });

  await waitForIdle();

  await app('clearItems1', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  await waitForIdle();

  await app('render1000Items2', () => {
    emitDomClickEvent(ButtonSelectors.Create1000);
  });

  await waitForIdle();

  await app('clearItems2', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  await waitForTraceFlush();

  await app('render5000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Create5000);
  });

  await waitForTraceFlush();

  await app('clearManyItems1', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  await waitForTraceFlush();

  await app('render5000Items2', () => {
    emitDomClickEvent(ButtonSelectors.Create5000);
  });

  await waitForTraceFlush();

  await app('clearManyItems2', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  await waitForIdle();

  await app('render1000Items3', () => {
    emitDomClickEvent(ButtonSelectors.Create1000);
  });

  await waitForIdle();

  await app('append1000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Append1000);
  });

  await waitForIdle();

  await app('append1000Items2', () => {
    emitDomClickEvent(ButtonSelectors.Append1000);
  });

  await waitForIdle();

  await app('updateEvery10thItem1', () => {
    emitDomClickEvent(ButtonSelectors.UpdateEvery10th);
  });

  await waitForIdle();

  await app('updateEvery10thItem2', () => {
    emitDomClickEvent(ButtonSelectors.UpdateEvery10th);
  });

  await waitForIdle();

  await app('selectFirstRow1', () => {
    emitDomClickEvent(ButtonSelectors.SelectFirstRow);
  });

  await waitForIdle();

  await app('selectSecondRow1', () => {
    emitDomClickEvent(ButtonSelectors.SelectSecondRow);
  });

  await waitForIdle();

  await app('removeFirstRow1', () => {
    emitDomClickEvent(ButtonSelectors.RemoveFirstRow);
  });

  await waitForIdle();

  await app('removeSecondRow1', () => {
    emitDomClickEvent(ButtonSelectors.RemoveSecondRow);
  });

  await waitForIdle();

  await app('swapRows1', () => {
    emitDomClickEvent(ButtonSelectors.SwapRows);
  });

  await waitForIdle();

  await app('swapRows2', () => {
    emitDomClickEvent(ButtonSelectors.SwapRows);
  });

  await waitForIdle();

  await app('clearItems4', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  // finishing bench
  enforcePaintEvent();
}
