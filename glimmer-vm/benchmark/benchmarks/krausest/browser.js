import render from './lib/index';

export default async function run() {
  await render(document.body, true);
}
