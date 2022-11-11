const crypto = require('crypto');

const SHA256 = (message) =>
	crypto
		.createHash('sha256')
		.update(typeof message === 'string' ? message : JSON.stringify(message))
		.digest('hex');

// for transactions: removes "data" field if empty, or escapes spaces inside. Next, goes JSON and removes all non-escaped spaces from the JSON.
const dataPadOrRemove = (obj) => {
	if (obj?.data && obj?.data !== '') {
		const tempObj = {};
		Object.entries(obj)
			.filter(([key, value]) => key !== 'data')
			.forEach(([key, value]) => (tempObj[key] = value));
		return tempObj;
	}
	// escape spaces in data field
	obj.data = obj.data.replaceAll(/\s/gm, ' ');
	return obj;
};

const removeSpaces = (obj) => {
	const objJson = JSON.stringify(dataPadOrRemove(obj));
	// replace non-escaped spaces
	const cleanedObjJson = objJson.replace(/(?<!\\)\s/gm, '');
	return cleanedObjJson;
};

const trimAndSha256Hash = (obj) => Buffer.from(SHA256(removeSpaces(obj)));

const isValidProof = (_hash, difficulty = 0) => {
	return _hash.slice(0, difficulty) === '0'.repeat(difficulty);
};


const fromBuffer = (input) => {
	const data = Buffer.from(input);
	return Array.prototype.map
		.call(new Uint8Array(data), (x) => ('00' + x.toString(16)).slice(-2))
		.join('')
		.match(/[a-fA-F0-9]{2}/g)
		.reverse()
		.join('');
}


module.exports = { SHA256, trimAndSha256Hash, isValidProof, fromBuffer };
