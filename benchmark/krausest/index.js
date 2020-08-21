import { createBenchmark, createCell } from '@glimmer/benchmark-env';
import ApplicationTemplate from './Application.hbs';
import Application from './Application';
import RowTemplate from './Row.hbs';
import Row from './Row';
import GlyphIcon from './GlyphIcon.hbs';
import buildData from './data';

const benchmark = createBenchmark();

benchmark.basicComponent('Row', RowTemplate, Row);
benchmark.basicComponent('Application', ApplicationTemplate, Application);

benchmark.templateOnlyComponent('GlyphIcon', GlyphIcon);

/** @type {{[name: string]: any}} */
const args = {};

const items = createCell(args, 'items', []);

Reflect.defineProperty(args, 'items', {
  get: () => items.get(),
  set: v => items.set(v),
  enumerable: true,
  configurable: false,
});

(async () => {
  const update = await benchmark.render('Application', args, document.body);
  await update('update', () => {
    args.items = buildData();
  });
})();
