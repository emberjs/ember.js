import { defineConfig } from 'vite';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig(({ mode }) => ({
  plugins: [
    ember(),
    {
      name: 'define custom import.meta.env',
      transform(code) {
        if (mode === 'development') {
          if (code.includes('import.meta.env?.DEV')) {
            return code.replace(/import\.meta\.env\?\.DEV/g, 'true');
          }
        } else if (mode === 'production') {
          if (code.includes('import.meta.env?.DEV')) {
            return code.replace(/import\.meta\.env\?\.DEV/g, 'false');
          }
        }
        return undefined;
      },
    },
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
}));
