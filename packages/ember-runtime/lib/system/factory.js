function Factory(klass, attrs) {
  this.isFactory = true;
  this.class = klass;
  this.attrs = attrs;
}

export default Factory;