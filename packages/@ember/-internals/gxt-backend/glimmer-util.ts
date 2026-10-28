export function unwrapTemplate(tpl: unknown) {
  return {
    asLayout() {
      return {
        compile() {
          return tpl;
        },
      };
    },
  };
}
