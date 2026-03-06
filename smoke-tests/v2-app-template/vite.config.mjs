import { defineConfig } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

// Exclude plain TypeScript file extensions from Babel so that Vite's built-in
// esbuild transform handles them. Babel is still applied to .gjs/.gts files
// (Glimmer template-tag syntax) which need the template compilation plugin.
const babelExtensions = extensions.filter(
  (ext) => ext !== '.ts' && ext !== '.mts'
);

export default defineConfig({
  plugins: [
    classicEmberSupport(),
    ember(),
    // extra plugins here
    babel({
      babelHelpers: 'runtime',
      extensions: babelExtensions,
    }),
  ],
  build: {
    // Output client assets to dist/client so the SSR server can serve them.
    outDir: 'dist/client',
  },
  ssr: {
    // Ensure Vite processes packages that import workspace-only packages (such
    // as @ember/* or @glimmer/*) through its own module resolver in SSR mode.
    // Without this, Node's native ESM resolution would be used for these
    // packages but the workspace packages they depend on wouldn't be findable.
    noExternal: [/^@ember\//, /^ember/, /^@embroider\//, /^@glimmer\//],
  },
});
