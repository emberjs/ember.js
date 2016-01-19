export default function calculateLocationDisplay(moduleName, loc = {}) {
  let { column, line } = loc.start || {};
  let moduleInfo = '';
  if (moduleName) {
    moduleInfo +=  `'${moduleName}' `;
  }

  if (line !== undefined && column !== undefined) {
    if (moduleName) {
      // only prepend @ if the moduleName was present
      moduleInfo += '@ ';
    }
    moduleInfo += `L${line}:C${column}`;
  }

  if (moduleInfo) {
    moduleInfo = `(${moduleInfo}) `;
  }

  return moduleInfo;
}
