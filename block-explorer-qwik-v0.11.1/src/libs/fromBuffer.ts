export default function (input) {
	const data = Buffer.from(input);
	return Array.prototype.map
		.call(new Uint8Array(data), (x) => ('00' + x.toString(16)).slice(-2))
		.join('')
		.match(/[a-fA-F0-9]{2}/g)
		.reverse()
		.join('');
}
