// Convert BigInt to JSON automatically
BigInt.prototype.toJSON = function () {
  // Option 1: Safe as Number (only if IDs < 9,007,199,254,740,991)
  return Number(this);

  // Option 2: Safer as String (if you expect very large IDs)
  // return this.toString();
};
