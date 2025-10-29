const timestamp = () => {
  const nowUtc = new Date(new Date().toUTCString());
  return new Date(nowUtc.getTime() + 6 * 60 * 60 * 1000);
};

module.exports = { timestamp };
