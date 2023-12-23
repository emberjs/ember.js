export enum ButtonSelectors {
  Create1000 = '#run',
  Create10000 = '#runlots',
  Append1000 = '#add',
  UpdateEvery10th = '#update',
  SelectFirstRow = 'tr:nth-child(1) a[data-test-select]',
  SelectSecondRow = 'tr:nth-child(2) a[data-test-select]',
  RemoveFirstRow = 'tr:nth-child(1) a[data-test-remove]',
  RemoveSecondRow = 'tr:nth-child(2) a[data-test-remove]',
  Clear = '#clear',
  SwapRows = '#swaprows',
}

export function emitDomClickEvent(selector: ButtonSelectors) {
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
