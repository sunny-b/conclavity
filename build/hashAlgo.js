'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
function hashAlgo(input, collection) {
  // const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  // const filteredInputArray = input.toLowerCase().replace(/[a-z\-]/g, '').split('');
  // const sum = filteredInputArray.reduce((acc, num) => acc + Number(num), 0);

  // return Math.floor((sum * 13) / 7) % collection.length;

  var justNums = input.toLowerCase().replace(/[a-z\-]/g, '');
  return Math.floor(justNums * 13) % collection.length;
}

function generateItemFromHash(siteId, collection) {
  var hashIdx = hashAlgo(siteId, collection);

  return collection[hashIdx];
}

exports.hashAlgo = hashAlgo;
exports.generateItemFromHash = generateItemFromHash;