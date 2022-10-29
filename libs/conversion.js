const { CONFIG } = require('../blockchain/src/constants');

const convert = {
	toCoins: (micros) => ({
		amount: (+micros / CONFIG.coinbase.microcoinsPerCoin).toFixed(
			String(CONFIG.coinbase.microcoinsPerCoin).length - 1
		),
		type: 'coins',
	}),
	toMicros: (wholes) => ({
		amount: wholes * CONFIG.coinbase.microcoinsPerCoin,
		type: 'microcoins',
	}),
};

module.exports = convert;
