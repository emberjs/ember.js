import { defineConfig } from 'vite';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  /**
    The package-size workflow measures this app. It shows the size of an
    app without the classic features.
  */
  define: {
    'import.meta.env.EMBER_DROP_CLASSIC_FEATURES': 'true',
  },
  plugins: [
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
});
