import { AST } from '@glimmer/syntax';

export default function calculateLocationDisplay(
  moduleName: string,
  loc?: AST.SourceLocation | undefined
): string {
  let moduleInfo = '';
  if (moduleName) {
    moduleInfo += `'${moduleName}' `;
  }

  if (loc) {
    let { column, line } = loc.start || { line: undefined, column: undefined };
    if (line !== undefined && column !== undefined) {
      if (moduleName) {
        // only prepend @ if the moduleName was present
        moduleInfo += '@ ';
      }
      moduleInfo += `L${line}:C${column}`;
    }
  }

  if (moduleInfo) {
    moduleInfo = `(${moduleInfo}) `;
  }

  return moduleInfo;
}
