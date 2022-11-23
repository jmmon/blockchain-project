export default {
	host: `http://localhost:`,
	defaultPort: 5555,
};

export const CONFIG = {
	coinbase: { microcoinsPerCoin: 1000000 },
};

export const convert = {
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
