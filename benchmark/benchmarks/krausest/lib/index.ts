import { createBenchmark } from '@glimmer-workspace/benchmark-env';

import Application from '@/components/Application';
import ApplicationTemplate from '@/components/Application.hbs';
import Row from '@/components/Row';
import RowTemplate from '@/components/Row.hbs';
import ButtonTemplate from '@/components/BsButton.hbs';
import { enforcePaintEvent, ButtonSelectors, emitDomClickEvent, waitForIdle } from '@/utils/compat';

export default async function render(element: HTMLElement, isInteractive: boolean) {
  const benchmark = createBenchmark();

  benchmark.templateOnlyComponent('BsButton', ButtonTemplate);
  benchmark.basicComponent('Row', RowTemplate, Row);
  benchmark.basicComponent('Application', ApplicationTemplate, Application);

  // starting app

  await waitForIdle();

  const app = await benchmark.render('Application', {}, element, isInteractive);

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

  await waitForIdle();

  await app('render5000Items1', () => {
    emitDomClickEvent(ButtonSelectors.Create5000);
  });

  await waitForIdle();

  await app('clearManyItems1', () => {
    emitDomClickEvent(ButtonSelectors.Clear);
  });

  await waitForIdle();

  await app('render5000Items2', () => {
    emitDomClickEvent(ButtonSelectors.Create5000);
  });

  await waitForIdle();

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
