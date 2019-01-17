export function blockStack() {
  let stack: number[] = [];

  return (id: number) => {
    if (stack.indexOf(id) > -1) {
      let close = `<!--%-b:${id}%-->`;
      stack.pop();
      return close;
    } else {
      stack.push(id);
      return `<!--%+b:${id}%-->`;
    }
  };
}
