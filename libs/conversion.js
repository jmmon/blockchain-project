const { CONFIG } = require('../blockchain/src/constants');

const convert = {
	toWholeCoins: (micros) => {
		return {
			amount: (micros / CONFIG.coinbase.microcoinsPerCoin).toFixed(
				CONFIG.coinbase.microcoinsPerCoin.length - 1
			),
			type: 'coins',
		};
	},
	toMicrocoins: (wholes) => {
		return { amount: wholes * CONFIG.coinbase.microcoinsPerCoin, type: 'microcoins' };
	},
};

module.exports = convert;
