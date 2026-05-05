import { defineConfig } from 'vite';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  build: {
    rolldownOptions: {
      treeshake: {
        moduleSideEffects: [
          { test: /\.css$/, sideEffects: true },
          { test: /@ember/, sideEffects: false, external: false },
          { test: /router_js/, sideEffects: false, external: false },
          { test: /rsvp/, sideEffects: false, external: false },
          { test: /backburner/, sideEffects: false, external: false },
        ],

      }
    }
  },
  plugins: [
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
});
