module.exports = {
  sanitize: (dirty) => (typeof dirty === 'string' ? dirty : ''),
};
