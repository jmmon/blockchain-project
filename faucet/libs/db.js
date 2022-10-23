const fs = require('fs');

const payoutRecord = 'payoutRecord/'; //  TODO: set wallets directory
const filePath = `${payoutRecord}payoutRecord.json`;
const TIME_BETWEEN_TRANSACTIONS_SECONDS = 4;

const db = {
	init() {
		if (!fs.existsSync(payoutRecord)) {
			fs.mkdirSync(payoutRecord);
		}

		fs.writeFileSync(filePath, '{}');
		return true;
	},

	get() {
		let object = {};
		try {
			const fileContents = fs.readFileSync(filePath, 'utf8');
			object = JSON.parse(fileContents);
			console.log({ object });
		} catch (err) {
			console.log(err);
		}
		return object;
	},

	updateAddress(object, address) {
		// request timestamp
		const currentTimeMs = Date.now();

		// if already exists
		if (object[address]) {
			// check timestamp
			const previousTimestampMs = Date.parse(object[address]);
			const differenceSeconds =
				(currentTimeMs - previousTimestampMs) / 1000;

			// if waited an hour or more
			if (differenceSeconds >= TIME_BETWEEN_TRANSACTIONS_SECONDS) {
				// add to file
				object[address] = new Date(currentTimeMs).toISOString();
				return true;
			} else {
				// error, not enough time has passed
				const endingTimestampMs = previousTimestampMs + 60 * 60 * 1000;
				const secondsRemaining =
					(endingTimestampMs - currentTimeMs) / 1000;
				const minutesRemaining = Math.ceil(secondsRemaining / 60);
				console.log(
					`Error: please wait about ${minutesRemaining} more minutes!`
				);

				return false;
			}
		}

		// new address, save the timestamp
		object[address] = new Date(currentTimeMs).toISOString();
		return true;
	},

	save(object) {
		try {
			// then re-save to file
			const dataJson = JSON.stringify(object);
			fs.writeFileSync(filePath, dataJson);
			console.log(
				'Done rewriting to file!\n',
				{ object },
				'\n',
				dataJson
			);
			return object;
			
		} catch (err) {
			console.log(err);
		}
	},

	findAndSave(address, nodeUrl, callback) {
		// grab file contents (an array) and
		// eventually, overwrite file with our new array
		let object = this.get();
		const success = this.updateAddress(object, address);

		if (success) {
			const updatedDatabase = this.save(object);
			return callback(success, updatedDatabase, address, nodeUrl);
		}
		return callback(false);
	},
};

module.exports = db;