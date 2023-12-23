import { createBenchmark } from '@glimmer-workspace/benchmark-env';

import Application from '@/components/Application';
import ApplicationTemplate from '@/components/Application.hbs';
import Row from '@/components/Row';
import RowTemplate from '@/components/Row.hbs';
import ButtonTemplate from '@/components/BsButton.hbs';
import { enforcePaintEvent, ButtonSelectors, emitDomClickEvent } from '@/utils/compat';

export default async function render(element: HTMLElement, isInteractive: boolean) {
  const benchmark = createBenchmark();

  benchmark.templateOnlyComponent('BsButton', ButtonTemplate);
  benchmark.basicComponent('Row', RowTemplate, Row);
  benchmark.basicComponent('Application', ApplicationTemplate, Application);

  // starting app

  const app = await benchmark.render('Application', {}, element, isInteractive);

  await app('render1000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Create1000);
  });

  await app('clearItems1', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  await app('render1000Items2', () => {
    emitDomClickEvent(ButtonSelectors.Create1000);
  });

  await app('clearItems2', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  await app('render10000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Create10000);
  });

  await app('clearItems3', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  await app('render1000Items3', () => {
    emitDomClickEvent(ButtonSelectors.Create1000);
  });

  await app('append1000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Append1000);
  });

  await app('updateEvery10thItem1', () => {
    emitDomClickEvent(ButtonSelectors.UpdateEvery10th);
  });

  await app('selectFirstRow1', () => {
    emitDomClickEvent(ButtonSelectors.SelectFirstRow);
  });

  await app('selectSecondRow1', () => {
    emitDomClickEvent(ButtonSelectors.SelectSecondRow);
  });

  await app('removeFirstRow1', () => {
    emitDomClickEvent(ButtonSelectors.RemoveFirstRow);
  });

  await app('removeSecondRow1', () => {
    emitDomClickEvent(ButtonSelectors.RemoveSecondRow);
  });

  await app('swapRows1', () => {
    emitDomClickEvent(ButtonSelectors.SwapRows);
  });

  await app('clearItems4', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  // finishing bench
  enforcePaintEvent();
}
