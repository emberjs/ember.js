import { read } from "ember-metal/streams/utils";

export default function getCellOrValue(ref) {
  return read(ref);
}
