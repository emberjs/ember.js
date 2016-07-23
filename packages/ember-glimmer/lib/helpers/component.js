export default {
  isInternalHelper: true,

  toReference(args) {
    return args.positional.at(0);
  }
};
