const crypto = require('crypto');
const SHA256 = (message) =>
	crypto.createHash('sha256').update(JSON.stringify(message)).digest('hex');

// for transactions: removes "data" field if empty, or escapes spaces inside. Next, goes JSON and removes all non-escaped spaces from the JSON.
// rebuild to make sure order stays the same
const removeSpaces = (obj) => {
	if (obj.data === '' || obj.data === null || obj.data === undefined) {
		const tempObj = {};
		Object.keys(obj)
			.filter((key) => key !== 'data')
			.forEach((key) => (tempObj[key] = obj[key]));
		obj = tempObj;
	} else {
		// escape spaces in data field
		obj.data = obj.data.replaceAll(/\s/gm, ' ');
	}

	const objJson = JSON.stringify(obj);

	// replace non-escaped spaces
	const cleanedObjJson = objJson.replace(/(?<!\\)\s/gm, '');

	return cleanedObjJson;
};

const trimAndSha256Hash = (obj) => SHA256(removeSpaces(obj));

const isValidProof = (_hash, difficulty = 1) => {
	return _hash.slice(0, difficulty) === '0'.repeat(difficulty);
};
module.exports = { SHA256, trimAndSha256Hash, isValidProof };
