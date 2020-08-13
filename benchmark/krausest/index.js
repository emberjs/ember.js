import { createBenchmark } from '@glimmer/benchmark-env';
import Application from './Application.hbs';
import RowTemplate from './Row.hbs';
import Row from './Row';
import GlyphIcon from './GlyphIcon.hbs';
import buildData from './data';

const benchmark = createBenchmark();

benchmark.basicComponent('Row', RowTemplate, Row);
benchmark.templateOnlyComponent('GlyphIcon', GlyphIcon);

const render = benchmark.compile(Application);

const state = {
  items: buildData(),
  lastSelected: null,
  select: item => {
    const lastSelected = state.lastSelected;
    if (lastSelected !== item && lastSelected !== null) {
      lastSelected.selected = false;
    }
    state.lastSelected = item;
    item.selected = true;
  },
};

(async () => {
  await render(document.body, state);
})();
