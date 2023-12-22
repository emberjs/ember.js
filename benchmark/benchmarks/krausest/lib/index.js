import { createBenchmark } from '@glimmer-workspace/benchmark-env';

import Application from './components/Application';
import ApplicationTemplate from './components/Application.hbs';
import Row from './components/Row';
import RowTemplate from './components/Row.hbs';
import buildData from './utils/data';

/**
 * @param {HTMLElement | import('../../../../packages/@glimmer/interfaces').SimpleElement} element
 * @param {boolean} isInteractive
 */
export default async function render(element, isInteractive) {
  const benchmark = createBenchmark();

  benchmark.basicComponent('Row', RowTemplate, Row);
  benchmark.basicComponent('Application', ApplicationTemplate, Application);

  /** @type {{[name: string]: any}} */
  const args = {
    items: buildData(),
  };
  enforcePaintEvent();
  performance.mark('glimmer-render-1000-rows-start');
  enforcePaintEvent();
  await benchmark.render('Application', args, element, isInteractive);
  performance.mark('glimmer-render-1000-rows-finished');
  enforcePaintEvent();
}

function enforcePaintEvent() {
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
