import { defineConfig } from 'vite';
import repo from '@glimmer-workspace/repo-metadata';

const published = repo.packages.filter((pkg) => !pkg.private).map((pkg) => pkg.name);

export default defineConfig({
  server: {
    open: '?hidepassed',
  },
  mode: 'testing',
  optimizeDeps: {
    entries: ['./packages/{@glimmer,@glimmer-workspace}/*/test/**/*-test.ts'],
  },
  plugins: [
    {
      name: 'define custom import.meta.env',
      async transform(code) {
        if (code.includes('import.meta.env.VM_LOCAL_DEV')) {
          return code.replace(/import.meta.env.VM_LOCAL_DEV/g, 'true');
        }
        return undefined;
      },
      enforce: 'pre',
    },
  ],
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.d.ts'],
  },
});
