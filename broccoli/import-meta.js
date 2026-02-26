function hasDEV(code) {
  return code.includes('import.meta.env?.DEV') || code.includes('import.meta.env.DEV');
}
export function importMetaRemoval(debugMacrosMode) {
  return {
    name: 'define custom import.meta.env',
    async transform(code) {
      if (debugMacrosMode === true) {
        if (hasDEV(code)) {
          return code.replace(/import.meta.env\??.DEV/g, 'true');
        }

        return;
      }

      if (debugMacrosMode === false) {
        if (hasDEV(code)) {
          return code.replace(/import.meta.env\??.DEV/g, 'false');
        }
      }

      return undefined;
    },
  };
}
