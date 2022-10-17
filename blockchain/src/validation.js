const invalidStringGen = ({ label, expected, actual }) =>
	`${label} invalid. Expected ${expected} / Actually ${actual}`;
const upperFirstLetter = (string) =>
	string.substring(0, 1).toUpperCase() + string.substring(1);
const failingCondition = ({ value, expected, type }) =>
	type === '==='
		? value !== expected
		: type === '!=='
		? value === expected
		: type === '>='
		? value < expected
		: type === '<='
		? value > expected
		: type === '>'
		? value <= expected
		: type === '<'
		? value >= expected
		: true; // fallback to force adding an error if no match

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
	if (!pattern.test(value)) {
		return invalidStringGen({
			label,
			expected,
			actual,
		});
	}
	return false;
};

const lengthCheck = ({ label, value, expected, type }) => {
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

const addFoundErrors = ({ missing, error }) => {
	if (error) missing.push(error);
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
		expected: 40,
		type: '===',
	});

	const missing = [typeResult, patternResult, lengthResult].filter(
		(result) => result !== false
	);
	const valid = missing.length === 0;
	if (valid) return { valid, missing: null };
	return { valid, missing };
};

// validation
const validatePublicKey = (pubKey) => {
	const label = 'SenderPubKey';
	const results = [
		typeCheck({ label, value: pubKey, type: 'string' }),
		lengthCheck({
			label,
			value: pubKey,
			expected: 65,
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

	const missing = results.filter((result) => result !== false);
	const valid = missing.length === 0;
	if (valid) return { valid, missing: null };
	return { valid, missing };
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
	const missing = results.filter((result) => result !== false);
	const valid = missing.length === 0;
	if (valid) return { valid, missing: null };
	return { valid, missing };
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
			expected: this.config.minTransactionFee,
			type: '>=',
		}),
	];
	const missing = results.filter((result) => result !== false);
	const valid = missing.length === 0;
	if (valid) return { valid, missing: null };
	return { valid, missing };
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
	const missing = results.filter((result) => result !== false);
	const valid = missing.length === 0;
	if (valid) return { valid, missing: null };
	return { valid, missing };
};

const validateDateCreated = (dateCreated, prevDateCreated, currentTime) => {
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
					expected: `transaction to be created before current time`,
					actual: `transaction created ${
						dateCreated - currentTime
					}ms after current time`,
			  })
			: false,

		// should be after previous transaction
		prevDateCreated && dateCreated <= prevDateCreated
			? invalidStringGen({
					label,
					expected: `prevTransaction to be created before block`,
					actual: `transaction created ${
						prevDateCreated - dateCreated
					}ms before prevTransaction`,
			  })
			: false,
	];
	const missing = results.filter((result) => result !== false);
	const valid = missing.length === 0;
	if (valid) return { valid, missing: null };
	return { valid, missing };
};

// validation, utils
// returns {valid: boolean; missing: array | null}
const validateFields = (fields, requiredFields) => {
	let missing = [];
	for (const field of requiredFields) {
		if (!fields.includes(field)) {
			missing.push(field);
		}
	}
	return missing.length > 0
		? { valid: false, missing }
		: { valid: true, missing: null };
};

const basicTxValidation = (transaction, date_transactions) => {
	let valid = true;
	let errors = [];

	// to:
	let toAddrResult = validateAddress(transaction.to, 'To');
	if (!toAddrResult.valid) {
		toAddrResult.missing.forEach((err) => errors.push(err));
	}

	// from:
	let fromAddrResult = validateAddress(transaction.from, 'From');
	if (!fromAddrResult.valid) {
		fromAddrResult.missing.forEach((err) => errors.push(err));
	}

	// value: number, >=0
	const valueResult = validateValue(transaction.value);
	if (!valueResult.valid) {
		valueResult.missing.forEach((err) => errors.push(err));
	}

	// fee: number, >minFee
	const feeResult = validateFee(transaction.fee);
	if (!feeResult.valid) {
		feeResult.missing.forEach((err) => errors.push(err));
	}

	// dateCreated: should be a number?? should be after the previous transaction's dateCreated, should be before today??
	const currentTime = Date.now();
	const prevDateCreated =
		date_transactions[date_transactions.indexOf(transaction) - 1]
			.dateCreated || undefined;
	const dateCreatedResult = validateDateCreated(
		transaction.dateCreated,
		prevDateCreated,
		currentTime
	);
	if (!dateCreatedResult.valid) {
		dateCreatedResult.missing.forEach((err) => errors.push(err));
	}

	// data: string,
	const dataResult = validateData(transaction.data);
	if (!dataResult.valid) {
		dataResult.missing.forEach((err) => errors.push(err));
	}

	// senderPubKey: string, hex, 65chars?
	const pubKeyResult = validatePublicKey(transaction.senderPubKey);
	if (!pubKeyResult.valid) {
		pubKeyResult.missing.forEach((err) => errors.push(err));
	}
	return { valid, errors };
};






module.exports = {
	invalidStringGen,
	upperFirstLetter,
	typeCheck,
	patternCheck,
	lengthCheck,
	valueCheck,
	addFoundErrors,
	validateAddress,
	validatePublicKey,
	validateValue,
	validateFee,
	validateData,
	validateDateCreated,
	validateFields,
	basicTxValidation,
};
