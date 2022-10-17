
const crypto = require("crypto");
const SHA256 = (message) =>
	crypto.createHash("sha256").update(JSON.stringify(message)).digest("hex");

// for transactions: removes "data" field if empty, or escapes spaces inside. Next, goes JSON and removes all non-escaped spaces from the JSON.
const removeSpaces = (obj) => {
	if (!obj.data) {
		// if data is '' or null / undefined
		const newObj = {};
		Object.keys(obj)
			.filter((key) => key !== 'data')
			.forEach((key) => (newObj[key] = obj[key]));
		obj = newObj;
	} else {
		// escape spaces in data field
		obj.data = obj.data.replaceAll(/\s/gm, '\ ');
	}
	// rebuild to make sure order stays the same
	const objJson= JSON.stringify(obj);

	// replace non-escaped spaces
	const escapedObjJson = objJson.replace(/(?<!\\)\s/gm, '');

	return escapedObjJson;
};

const trimAndSha256Hash = (obj) => SHA256(removeSpaces(obj));

const isValidProof = (_hash, difficulty = 1) => {
		return _hash.slice(0, difficulty) === '0'.repeat(difficulty);
	}
module.exports = {SHA256, trimAndSha256Hash, isValidProof};