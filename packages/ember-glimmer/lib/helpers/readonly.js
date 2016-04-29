import { helper } from '../helper';

function readonly(args) {
  return args[0];
}

export default helper(readonly);
