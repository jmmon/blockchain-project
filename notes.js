/* Blocks from example api: */

[
	{
		index: 0,
		transactions: [
			{
				from: "0000000000000000000000000000000000000000",
				to: "f3a1e69b6176052fcc4a3248f1c5a91dea308ca9",
				value: 1000000000000,
				fee: 0,
				dateCreated: "2018-01-01T00:00:00.000Z",
				data: "genesis tx",
				senderPubKey:
					"00000000000000000000000000000000000000000000000000000000000000000",
				transactionDataHash:
					"8a684cb8491ee419e7d46a0fd2438cad82d1278c340b5d01974e7beb6b72ecc2",
				senderSignature: [
					"0000000000000000000000000000000000000000000000000000000000000000",
					"0000000000000000000000000000000000000000000000000000000000000000",
				],
				minedInBlockIndex: 0,
				transferSuccessful: true,
			},
		],
		difficulty: 0,
		minedBy: "0000000000000000000000000000000000000000",
		blockDataHash:
			"15cc5052fb3c307dd2bfc6bcaa057632250ee05104e4fb7cc75e59db1a92cefc",
		nonce: 0,
		dateCreated: "2018-01-01T00:00:00.000Z",
		blockHash:
			"c6da93eb4249cb5ff4f9da36e2a7f8d0d61999221ed6910180948153e71cc47f",
	},
	{
		index: 1,
		transactions: [
			{
				from: "0000000000000000000000000000000000000000",
				to: "84ede81c58f5c490fc6e1a3035789eef897b5b35",
				value: 5000020,
				fee: 0,
				dateCreated: "2022-07-20T14:19:15.845Z",
				data: "coinbase tx",
				senderPubKey:
					"00000000000000000000000000000000000000000000000000000000000000000",
				transactionDataHash:
					"91a7fa0c81fdf844f56e5a70c45512880926a428e0481f7c809183662ae1da80",
				senderSignature: [
					"0000000000000000000000000000000000000000000000000000000000000000",
					"0000000000000000000000000000000000000000000000000000000000000000",
				],
				minedInBlockIndex: 1,
				transferSuccessful: true,
			},
			{
				from: "f3a1e69b6176052fcc4a3248f1c5a91dea308ca9",
				to: "a1de0763f26176c6d68cc77e0a1c2c42045f2314",
				value: 500000,
				fee: 10,
				dateCreated: "2022-07-20T14:04:15.783Z",
				data: "Faucet -> Alice",
				senderPubKey:
					"8c4431db61e9095d5794ff53a3ae4171c766cadef015f2e11bec22b98a80f74a0",
				transactionDataHash:
					"40fc65e4928dcca4752a423fa28610d2acc4d710ed0a42e46df1b22c2ff11a0f",
				senderSignature: [
					"bc207572cd98770351bc7f646b5a44823b30edb39dcc55afc8ca052d3d2af187",
					"5245be13112ae5a3bcd63379a7ea3ecabc97552a224712ebb11f2863ea5085f7",
				],
				minedInBlockIndex: 1,
				transferSuccessful: true,
			},
			{
				from: "f3a1e69b6176052fcc4a3248f1c5a91dea308ca9",
				to: "b3d72ad831b3e9cdbdaeda5ff4ae8e9cf182e548",
				value: 700000,
				fee: 10,
				dateCreated: "2022-07-20T14:05:55.797Z",
				data: "Faucet -> Bob",
				senderPubKey:
					"8c4431db61e9095d5794ff53a3ae4171c766cadef015f2e11bec22b98a80f74a0",
				transactionDataHash:
					"fc412c614c644ebf18a5aab6a9b58c0a67d42088643cd24e7b3ea1f2b9a69b3c",
				senderSignature: [
					"9d6ef7e1e4d6c1518310307a309c4234c2dfdff2bcaaf4cc0f64d319d863ad5",
					"dcd0f54b97772f19496c5f4546095c1e6bd950425a4fff8c295e4bf75830ca79",
				],
				minedInBlockIndex: 1,
				transferSuccessful: true,
			},
		],
		difficulty: 1,
		prevBlockHash:
			"c6da93eb4249cb5ff4f9da36e2a7f8d0d61999221ed6910180948153e71cc47f",
		minedBy: "84ede81c58f5c490fc6e1a3035789eef897b5b35",
		blockDataHash:
			"b874dbf54fc4575e8e3dcecf60cb88d00cad72bd97e7060fdff39cd00a26266a",
		nonce: 32,
		dateCreated: "2022-07-20T14:19:15.846Z",
		blockHash:
			"0f96e8f672a008a3a5672fd4fc5672f4aea879797e39bc1c3345ee922f6ea765",
	},
	{
		index: 2,
		transactions: [
			{
				from: "0000000000000000000000000000000000000000",
				to: "84ede81c58f5c490fc6e1a3035789eef897b5b35",
				value: 5000040,
				fee: 0,
				dateCreated: "2022-07-20T14:19:15.872Z",
				data: "coinbase tx",
				senderPubKey:
					"00000000000000000000000000000000000000000000000000000000000000000",
				transactionDataHash:
					"ce678b009c72b94408384b7c9af124c584cff6957a32e6ec83a38338a378336f",
				senderSignature: [
					"0000000000000000000000000000000000000000000000000000000000000000",
					"0000000000000000000000000000000000000000000000000000000000000000",
				],
				minedInBlockIndex: 2,
				transferSuccessful: true,
			},
			{
				from: "a1de0763f26176c6d68cc77e0a1c2c42045f2314",
				to: "b3d72ad831b3e9cdbdaeda5ff4ae8e9cf182e548",
				value: 400000,
				fee: 20,
				dateCreated: "2022-07-20T14:07:35.803Z",
				data: "Alice -> Bob",
				senderPubKey:
					"30f9d17cff6b8a182df541e86344516a774c450be73d0a05624a9db7748c74cf1",
				transactionDataHash:
					"a4dc83fd2f8ac2d79750b1e7dc79c0a5abb35f2a6bba4429dbd7419baffbd1c1",
				senderSignature: [
					"6c3cb937b4a0a356cecd75db2efc6beb90f58393a5b0b60aeaf211b23e1a1e28",
					"34c1bbd98fa1d96ef056bfa9db17b5d2596119912d83970f2dfd5e00255ea6e0",
				],
				minedInBlockIndex: 2,
				transferSuccessful: true,
			},
			{
				from: "a1de0763f26176c6d68cc77e0a1c2c42045f2314",
				to: "22e2864c613e4f778bb25ddb2b0022d1fbb11c8c",
				value: 400000,
				fee: 20,
				dateCreated: "2022-07-20T14:07:35.807Z",
				data: "Alice -> Peter (no funds)",
				senderPubKey:
					"30f9d17cff6b8a182df541e86344516a774c450be73d0a05624a9db7748c74cf1",
				transactionDataHash:
					"a444258de3872f45c5726772cef74be9c46e3d0ce4c70659c8f9a4fe59d9ff32",
				senderSignature: [
					"63b83ca32b4f5d7f98baf4b45770cff6c969070c587f15071bb711c9c1619553",
					"38d1c7d9e8040b94ed533431d70e50864a1b86190da65e7b46fb08faafa266ee",
				],
				minedInBlockIndex: 2,
				transferSuccessful: false,
			},
		],
		difficulty: 2,
		prevBlockHash:
			"0f96e8f672a008a3a5672fd4fc5672f4aea879797e39bc1c3345ee922f6ea765",
		minedBy: "84ede81c58f5c490fc6e1a3035789eef897b5b35",
		blockDataHash:
			"bd7e00cf766a43513b9a3ffbc5d5826729c6c840cc412e2d4dba12ffefaf939c",
		nonce: 342,
		dateCreated: "2022-07-20T14:19:15.872Z",
		blockHash:
			"0069cf0333f8d88113712a69617b7cd642d98b09cd7e8ec028cb99c2c3e50d7c",
	},
]


/* Calculating Cumulative Difficulty of the given chain: */

d0 == 0
d1 == 1
d2 == 2

16^0 == 1
16^1 == 16
16^2 == 256

dTotal == 1 + 16 + 256
dTotal == 273