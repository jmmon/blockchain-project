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
	if (failingCondition({ value: value.length, expected, type})) {
		return invalidStringGen({
			label,
			expected: `length ${type} ${expected}`,
			actual: `length === ${value.length}`,
		});
	}
	return false;
};

const valueCheck = ({ label, value, expected, type }) => {
	if (failingCondition({ value, expected, type})) {
		return invalidStringGen({
			label,
			expected: `value ${type} ${expected}`,
			actual: `value === ${value}`,
		});
	}
	return false;
};

const addFoundErrors = ({missing, error}) => {
	if (error) missing.push(error);
}

module.exports = {
	invalidStringGen,
	upperFirstLetter,
	typeCheck,
	patternCheck,
	lengthCheck,
	valueCheck,
	addFoundErrors,
};
