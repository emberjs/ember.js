import { createBenchmark } from '@glimmer/benchmark-env';

import Application from './components/Application';
import ApplicationTemplate from './components/Application.hbs';
import Row from './components/Row';
import RowTemplate from './components/Row.hbs';
import buildData from './utils/data';

/**
 * @param {HTMLElement | import('@simple-dom/interface').SimpleElement} element
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

  await benchmark.render('Application', args, element, isInteractive);
}
