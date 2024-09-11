import { PluginOption, defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: '?hidepassed',
  },
  mode: 'testing',
  plugins: [
    /**
     * A similar plugin exists for our rollup builds
     */
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
