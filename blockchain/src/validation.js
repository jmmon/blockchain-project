const { hexPattern, CONFIG } = require('./constants');

const invalidStringGen = ({ label, expected, actual }) =>
	`${label} invalid. Expected ${expected} / Actually ${actual}`;
const upperFirstLetter = (string) =>
	string.substring(0, 1).toUpperCase() + string.substring(1);
const failingCondition = ({ value, expected, type }) => {
	value = String(value);
	expected = String(expected);
	return type === '==='
		? value !== expected
		: type === '!=='
		? value === expected
		: type === '=='
		? value != expected
		: type === '!='
		? value == expected
		: type === '>='
		? value < expected
		: type === '<='
		? value > expected
		: type === '>'
		? value <= expected
		: type === '<'
		? value >= expected
		: true; // fallback to force adding an error if no match
};

const typeCheck = ({ label, value, type }) => {
	const actualType = typeof value;
	if (actualType !== type) {
		return invalidStringGen({
			label,
			expected: type,
			actual: actualType,
		});
	}
	return false;
};

const patternCheck = ({ label, value, pattern, expected, actual }) => {
	const isValid = pattern.test(value);
	if (!isValid) {
		// console.log('failed pattern.test(value)', { isValid });
		return invalidStringGen({
			label,
			expected,
			actual,
		});
	}
	return false;
};

const lengthCheck = ({ label, value, expectedLength: expected, type }) => {
	if (failingCondition({ value: value.length, expected, type })) {
		return invalidStringGen({
			label,
			expected: `length ${type} ${expected}`,
			actual: `length === ${value.length}`,
		});
	}
	return false;
};

const valueCheck = ({ label, value, expected, type }) => {
	if (failingCondition({ value, expected, type })) {
		return invalidStringGen({
			label,
			expected: `value ${type} ${expected}`,
			actual: `value === ${value}`,
		});
	}
	return false;
};

/*
	----------------------------------------------------------------
		VALIDATION
	----------------------------------------------------------------
	*/

// validation, utils
const validateAddress = (address, label) => {
	const typeResult = typeCheck({ label, value: address, type: 'string' });
	const patternResult = patternCheck({
		label,
		value: address,
		pattern: hexPattern,
		expected: 'to be valid hex string',
		actual: `not valid hex string`,
	});
	const lengthResult = lengthCheck({
		label,
		value: address,
		expectedLength: 40,
		type: '===',
	});

	const errors = [typeResult, patternResult, lengthResult].filter(
		(result) => result !== false
	);
	const valid = errors.length === 0;
	if (valid) return { valid, errors: null };
	return { valid, errors };
};

// validation
const validatePublicKey = (pubKey) => {
	const label = 'SenderPubKey';
	const results = [
		typeCheck({ label, value: pubKey, type: 'string' }),
		lengthCheck({
			label,
			value: pubKey,
			expectedLength: 65,
			type: '===',
		}),
		patternCheck({
			label,
			value: pubKey,
			pattern: hexPattern,
			expected: 'to be hex string',
			actual: 'is not hex string',
		}),
	];

	const errors = results.filter((result) => result !== false);
	const valid = errors.length === 0;
	if (valid) return { valid, errors: null };
	return { valid, errors };
};

const validateValue = (value) => {
	let label = 'Value';
	const results = [
		typeCheck({
			label,
			value: value,
			type: 'number',
		}),
		valueCheck({
			label,
			value: value,
			expected: 0,
			type: '>=',
		}),
	];
	const errors = results.filter((result) => result !== false);
	const valid = errors.length === 0;
	if (valid) return { valid, errors: null };
	return { valid, errors };
};

const validateFee = (fee) => {
	let label = 'Fee';
	const results = [
		typeCheck({
			label,
			value: fee,
			type: 'number',
		}),
		valueCheck({
			label,
			value: fee,
			expected: CONFIG.transactions.minFee,
			type: '>=',
		}),
	];
	const errors = results.filter((result) => result !== false);
	const valid = errors.length === 0;
	if (valid) return { valid, errors: null };
	return { valid, errors };
};

const validateData = (data) => {
	const label = 'Data';
	const results = [
		typeCheck({
			label,
			value: data,
			type: 'string',
		}),
	];
	const errors = results.filter((result) => result !== false);
	const valid = errors.length === 0;
	if (valid) return { valid, errors: null };
	return { valid, errors };
};

// i.e. blockDataHash, blockHash, prevBlockHash* (only basic), transactionDataHash
const validateHash = (hash, label, length) => {
	// type length pattern value
	// console.log(
	// 	{ hashLength: hash.length, type: typeof hash.length },
	// 	{ expectedLength: length, type: typeof length }
	// );

	const results = [
		typeCheck({
			label,
			value: hash,
			type: 'string',
		}),
		lengthCheck({
			label,
			value: hash,
			expectedLength: length,
			type: '==',
		}),
		patternCheck({
			label,
			value: hash,
			pattern: hexPattern,
			expected: `to be hex`,
			actual: `failed validation`,
		}),
	];
	const errors = results.filter((result) => result !== false);
	const valid = errors.length === 0;
	if (valid) return { valid, errors: null };
	return { valid, errors };
};

const validateDateCreated = (
	dateCreated,
	prevDateCreated,
	currentTime,
	isBlock = false
) => {
	const label = 'DateCreated';
	const results = [
		typeCheck({
			label,
			value: dateCreated,
			type: 'number',
		}),

		// should be before right now
		dateCreated > currentTime
			? invalidStringGen({
					label,
					expected: `${
						isBlock ? 'block' : 'transaction'
					} to be created before current time`,
					actual: `${isBlock ? 'block' : 'transaction'} created ${
						dateCreated - currentTime
					}ms after current time`,
			  })
			: false,

		// if not after previous transaction/block
		prevDateCreated && dateCreated <= prevDateCreated
			? invalidStringGen({
					label,
					expected: `prev${
						isBlock ? 'Block' : 'Transaction'
					} to be created before ${
						isBlock ? 'block' : 'transaction'
					}`,
					actual: `${isBlock ? 'block' : 'transaction'} created ${
						prevDateCreated - dateCreated
					}ms before prev${isBlock ? 'Block' : 'Transaction'}`,
			  })
			: false,
	];
	const errors = results.filter((result) => result !== false);
	const valid = errors.length === 0;
	if (valid) return { valid, errors: null };
	return { valid, errors };
};

// validation, utils
// returns {valid: boolean; errors: array | null}
const validateFields = (fields, requiredFields) => {
	console.log('--validateBlockFields');
	let errors = [];
	for (const field of requiredFields) {
		if (!fields.includes(field)) {
			errors.push(field);
		}
	}
	return errors.length > 0
		? { valid: false, errors }
		: { valid: true, errors: null };
};

const basicTxValidation = ({ transaction, prevDateParsed }) => {
	let valid = true;
	let errors = [];

	// to:
	let toAddrResult = validateAddress(transaction.to, 'To');
	if (!toAddrResult.valid) {
		toAddrResult.errors.forEach((err) => errors.push(err));
	}

	// from:
	let fromAddrResult = validateAddress(transaction.from, 'From');
	if (!fromAddrResult.valid) {
		fromAddrResult.errors.forEach((err) => errors.push(err));
	}

	// value: number, >=0
	const valueResult = validateValue(transaction.value);
	if (!valueResult.valid) {
		valueResult.errors.forEach((err) => errors.push(err));
	}

	// fee: number, >minFee
	const feeResult = validateFee(transaction.fee);
	if (!feeResult.valid) {
		feeResult.errors.forEach((err) => errors.push(err));
	}

	// dateCreated: should be a number?? should be after the previous transaction's dateCreated, should be before today??
	const currentTime = Date.now();
	const dateCreatedResult = validateDateCreated(
		Date.parse(transaction.dateCreated),
		prevDateParsed || undefined,
		currentTime
	);
	if (!dateCreatedResult.valid) {
		dateCreatedResult.errors.forEach((err) => errors.push(err));
	}

	// data: string,
	const dataResult = validateData(transaction.data);
	if (!dataResult.valid) {
		dataResult.errors.forEach((err) => errors.push(err));
	}

	// senderPubKey: string, hex, 65chars?
	const pubKeyResult = validatePublicKey(transaction.senderPubKey);
	if (!pubKeyResult.valid) {
		pubKeyResult.errors.forEach((err) => errors.push(err));
	}
	return { valid, errors };
};

const validateBlockValues = (block, prevBlock) => {
	// go thru each entry and make sure the value fits the "requirements"
	console.log('--validateBlockValues');
	const prevDateParsed = Date.parse(prevBlock.dateCreated) || undefined;

	let errors = [];
	let field = '';
	let label = '';
	let currentValue;

	field = 'index';
	label = upperFirstLetter(field);
	currentValue = block[field];
	const indexTypeError = typeCheck({
		label,
		value: currentValue,
		type: 'number',
	});
	if (indexTypeError) errors.push(indexTypeError);
	const indexValueError = valueCheck({
		label,
		value: currentValue,
		expected: prevBlock[field] + 1,
		type: '===',
	});
	if (indexValueError) errors.push(indexValueError);

	// transactions: should be array, should have length >= 1
	field = 'transactions';
	label = upperFirstLetter(field);
	currentValue = block[field];
	// console.log({ transactions: currentValue });
	// console.log('keys:', Object.keys(currentValue));
	const transactionsTypeError = typeCheck({
		label,
		value: currentValue,
		type: 'object',
	});
	if (transactionsTypeError) errors.push(transactionsTypeError);
	const transactionsLengthError = lengthCheck({
		label,
		value: Object.keys(currentValue), // because for some reason it comes in as an object
		expectedLength: 1,
		type: '>=',
	});
	if (transactionsLengthError) errors.push(transactionsLengthError);

	// difficulty: should be a number
	field = 'difficulty';
	label = upperFirstLetter(field);
	currentValue = block[field];
	const difficultyTypeError = typeCheck({
		label,
		value: currentValue,
		type: 'number',
	});
	if (difficultyTypeError) errors.push(difficultyTypeError);

	// prevBlockHash: should be a string, should have only certain characters ?hex?, should be so many characters (40?), should match prevBlock's blockHash
	field = 'prevBlockHash';
	label = upperFirstLetter(field);
	currentValue = block[field];
	let prevBlockHashResult = validateHash(
		currentValue,
		label,
		block.index === 0 ? 1 : 64
	);
	if (!prevBlockHashResult.valid)
		prevBlockHashResult.errors.forEach((err) => errors.push(err));
	const prevBlockHashValueError = valueCheck({
		label,
		value: currentValue,
		expected: prevBlock.blockHash,
		type: '===',
	});
	if (prevBlockHashValueError) errors.push(prevBlockHashValueError);

	// minedBy: should be an address, certain characters? || all 0's, 40 characters, string
	let minedByAddrResult = validateAddress(block.minedBy, 'MinedBy');
	if (!minedByAddrResult.valid) {
		minedByAddrResult.errors.forEach((err) => errors.push(err));
	}

	// blockDataHash: should be string, only have certain characters, 40 characters?, (Will recalculate later)
	field = 'blockDataHash';
	currentValue = block[field];
	label = upperFirstLetter(field);
	const blockDataHashResult = validateHash(currentValue, label, 64); // length, string type, hex pattern
	if (!blockDataHashResult.valid) {
		blockDataHashResult.errors.forEach((err) => errors.push(err));
	}

	// nonce: should be a number, (later, will validate should give us the correct difficulty)
	field = 'nonce';
	label = upperFirstLetter(field);
	currentValue = block[field];
	const nonceTypeError = typeCheck({
		label,
		value: currentValue,
		type: 'number',
	});
	if (nonceTypeError) errors.push(nonceTypeError);

	// dateCreated: should be a number?? should be after the previous transaction's dateCreated, should be before today??
	const currentTime = Date.now();
	const dateCreatedResult = validateDateCreated(
		Date.parse(block.dateCreated),
		prevDateParsed,
		currentTime,
		true
	);
	if (!dateCreatedResult.valid) {
		dateCreatedResult.errors.forEach((err) => errors.push(err));
	}

	// blockHash: should be a string, only certain characters, 64 characters? (recalc later)
	label = 'BlockHash';
	const blockHashResult = validateHash(block['blockHash'], label, 64); // length, string type, hex pattern
	if (!blockHashResult.valid) {
		blockHashResult.errors.forEach((err) => errors.push(err));
	}

	// finally, return the results!
	if (errors.length > 0) return { valid: false, errors };
	return { valid: true, errors: null };
}; // validateBlockValues

module.exports = {
	invalidStringGen,
	upperFirstLetter,
	typeCheck,
	patternCheck,
	lengthCheck,
	valueCheck,
	validateAddress,
	validatePublicKey,
	validateValue,
	validateFee,
	validateData,
	validateDateCreated,
	validateFields,
	basicTxValidation,
	validateBlockValues,
};
