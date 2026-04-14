// Vite plugin to configure esbuild for legacy decorator support
// This is needed because @ember/-internals packages use TypeScript legacy decorators
// and the pre-bundling phase needs experimentalDecorators enabled.
export default function esbuildDecoratorsPlugin() {
  return {
    name: 'esbuild-decorators',
    config() {
      return {
        esbuild: {
          tsconfigRaw: {
            compilerOptions: {
              experimentalDecorators: true,
            },
          },
        },
        optimizeDeps: {
          esbuildOptions: {
            tsconfigRaw: {
              compilerOptions: {
                experimentalDecorators: true,
              },
            },
          },
        },
      };
    },
  };
}
