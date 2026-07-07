const processed = new Set();
module.exports = {
  has:(id)=>processed.has(id),
  add:(id)=>processed.add(id)
};
