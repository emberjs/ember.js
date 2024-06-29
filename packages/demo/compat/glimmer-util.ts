export function unwrapTemplate(tpl) {
  return {
    asLayout(){
      return {
        compile() {
          // debugger;
          console.log('as-layout compile', ...arguments);
            return tpl;
        }
      };
    }
  };
};

