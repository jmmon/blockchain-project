const {hexPattern} = require('./constants');
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
			expected: this.config.transactions.minFee,
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

const validateBlockValues = (block, prevBlock) => {
	// go thru each entry and make sure the value fits the "requirements"
	console.log('--validateBlockValues:', { block, prevBlock });

	let missing = [];
	let field = '';
	let label = '';
	let currentValue;

	field = 'index';
	label = upperFirstLetter(field);
	currentValue = block[field];
	addFoundErrors({
		missing,
		error: typeCheck({ label, value: currentValue, type: 'number' }),
	});
	addFoundErrors({
		missing,
		error: valueCheck({
			label,
			value: currentValue,
			expected: prevBlock[field] + 1,
			type: '===',
		}),
	});

	// transactions: should be array, should have length >= 1
	field = 'transactions';
	label = upperFirstLetter(field);
	currentValue = block[field];
	addFoundErrors({
		missing,
		error: typeCheck({ label, value: currentValue, type: 'array' }),
	});
	addFoundErrors({
		missing,
		error: lengthCheck({
			label,
			value: currentValue,
			expected: 1,
			type: '>=',
		}),
	});

	// difficulty: should be a number
	field = 'difficulty';
	label = upperFirstLetter(field);
	currentValue = block[field];
	addFoundErrors({
		missing,
		error: typeCheck({ label, value: currentValue, type: 'number' }),
	});

	// prevBlockHash: should be a string, should have only certain characters ?hex?, should be so many characters (40?), should match prevBlock blockHash
	field = 'prevBlockHash';
	label = upperFirstLetter(field);
	currentValue = block[field];
	addFoundErrors({
		missing,
		error: typeCheck({ label, value: currentValue, type: 'string' }),
	});
	if (currentValue !== prevBlock.blockHash) {
		addFoundErrors({
			missing,
			error: invalidStringGen({
				label: upperFirstLetter(field),
				expected: "value to match previous block's blockHash",
				actual: `is ${currentValue} instead of ${prevBlock.blockHash}`,
			}),
		});
	}
	if (block.index === 1) {
		// special case, special messages on these two
		if (currentValue !== '1') {
			addFoundErrors({
				missing,
				error: invalidStringGen({
					label: upperFirstLetter(field),
					expected: "index 1 prevBlockHash to be '1'",
					actual: `index 1 prevBlockHash is ${currentValue}`,
				}),
			});
		}
		if (currentValue.length !== 1) {
			addFoundErrors({
				missing,
				error: invalidStringGen({
					label: upperFirstLetter(field),
					expected: 'index 1 prevBlockHash.length to be 1',
					actual: `index 1 prevBlockHash.length === ${currentValue.length}`,
				}),
			});
		}
	} else {
		// only hex characters
		addFoundErrors({
			missing,
			error: patternCheck({
				label,
				value: currentValue,
				pattern: hexPattern,
				expected: 'to be valid hex string',
				actual: 'not valid hex string',
			}),
		});

		// 64 length
		addFoundErrors({
			missing,
			error: lengthCheck({
				label,
				value: currentValue,
				expected: 64,
				type: '===',
			}),
		});
	}

	// minedBy: should be an address, certain characters? || all 0's, 40 characters, string
	let minedByAddrResult = validateAddress(block.minedBy, 'MinedBy');
	if (!minedByAddrResult.valid) {
		minedByAddrResult.missing.forEach((err) => missing.push(err));
	}

	// blockDataHash: should be string, only have certain characters, 40 characters?, (Will recalculate later)
	field = 'blockDataHash';
	currentValue = block[field];
	label = upperFirstLetter(field);
	addFoundErrors({
		missing,
		error: typeCheck({ label, value: currentValue, type: 'string' }),
	});
	addFoundErrors({
		missing,
		error: patternCheck({
			label,
			value: currentValue,
			pattern: hexPattern,
			expected: 'to be valid hex string',
			actual: `not valid hex string`,
		}),
	});
	addFoundErrors({
		missing,
		error: lengthCheck({
			label,
			value: currentValue,
			expected: 64,
			type: '===',
		}),
	});

	// nonce: should be a number, (later, will validate should give us the correct difficulty)
	field = 'nonce';
	label = upperFirstLetter(field);
	currentValue = block[field];
	addFoundErrors({
		missing,
		error: typeCheck({ label, value: currentValue, type: 'number' }),
	});

	// dateCreated: should be a number?? should be after the previous block's dateCreated, should be before today??
	field = 'dateCreated';
	label = upperFirstLetter(field);
	currentValue = block[field];
	addFoundErrors({
		missing,
		error: typeCheck({ label, value: currentValue, type: 'number' }),
	});
	if (currentValue <= prevBlock[field]) {
		addFoundErrors({
			missing,
			error: invalidStringGen({
				label: upperFirstLetter(field),
				expected: `prevBlock to be created before block`,
				actual: `block created ${
					prevBlock[field] - currentValue
				}ms before prevBlock`,
			}),
		});
	}
	const currentTime = Date.now();
	if (currentValue > currentTime) {
		addFoundErrors({
			missing,
			error: invalidStringGen({
				label: upperFirstLetter(field),
				expected: `block to be created before current time`,
				actual: `block created ${
					currentValue - currentTime
				}ms after current time`,
			}),
		});
	}

	// blockHash: should be a string, only certain characters, 64 characters? (recalc later)
	field = 'blockHash';
	label = upperFirstLetter(field);
	currentValue = block[field];
	addFoundErrors({
		missing,
		error: typeCheck({ label, value: currentValue, type: 'string' }),
	});
	addFoundErrors({
		missing,
		error: patternCheck({
			label,
			value: currentValue,
			pattern: hexPattern,
			expected: 'to be valid hex string',
			actual: `not valid hex string`,
		}),
	});
	addFoundErrors({
		missing,
		error: lengthCheck({
			label,
			value: currentValue,
			expected: 64,
			type: '===',
		}),
	});

	// finally, return the results!
	if (missing.length > 0) return { valid: false, missing };
	return { valid: true, missing: null };
}; // validateBlockValues

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
	validateBlockValues,

};
