import { component$, Resource } from '@builder.io/qwik';
import { useEndpoint, useLocation } from '@builder.io/qwik-city';

interface iEndpoint {
	result: {
		data: Object;
		error: String;
	};
}

export default component$(() => {
	const location = useLocation();
	const searchTerms = location.query.query;

	console.log('inside component:', { searchTerms });
	const searchResults = useEndpoint<iEndpoint>();
	// What to do:
	return (
		<div>
			<h1>Search Results</h1>
			<Resource
				value={searchResults}
				onPending={() => <div>Loading...</div>}
				onRejected={() => <div>Error</div>}
				onResolved={(results) => {
					console.log({ results });
					return (
						<div>
							{results &&
								Object.entries(results).map(([key, val]) => (
									<div>
										{key}:{' '}
										{typeof val === 'object'
											? Object.entries(val).join(', ')
											: val}
									</div>
								))}
						</div>
					);
				}}
			/>
		</div>
	);
});

export const onGet: RequestHandler<iEndpoint> = async ({ request, response, url, params }) => {
	const query = url.searchParams.get('query');
	console.log('query:', query);
	// do some sorting and fetching of the data?
	/*
		Take input and "parse?" to decide if it's: (Figure out a priority for those search terms)
			address: (40 chars, hex)
				to, from, (transactions),
				minedBy, (blocks),
			hash: (64 chars (or 1 char for genesis), hex)
				blockDataHash: 64chars: 
				blockHash: 64chars: 
				prevBlockHash: 1char || 64chars: 
				txDataHash: 64chars: 

			index / minedInBlockIndex, (blocks, transactions) (shoud be typeof Number)
			senderPubKey, (transactions) 65chars (65chars, hex)
			data, (transactions) (string?)
			dateCreated, (blocks, transactions) (parses to date?)
			senderSignature, (transaction: 64 chars, hex,  (a|b|a+b)

	Could fetch blocks, and then filter the blocks here to build up results lists
	Or just skip it all! call it good...
*/
	const length = query?.length;
	const isHex = hexCheck(query);
	const isNumber = typeof +query === 'number';

	const result = {data: [], error: ''};

	try {
		let url = `http://localhost:${params.ip}/`;
		console.log('baseUrl:', url);

		if (isHex) {
			if (length == 40) {
				// is an address
				url += `addresses/${query}`;
				const data = await fetch(url).then(res => res.json());
				result.data.push(data); 

			} else if (length == 64 || length == 1 || length == 128) {
				// is a hash OR signature
				if (length == 64) {
					//hash or part of signature
				} else if (length == 128) {
					// signature
				} else if (length == 1) {
					// genesis block prevBlockHash
				}
				url += `addresses/${query}`;
			} else if (length == 65) {
				// is senderPubKey
			}
		} else if (typeof Date.parse(query) === 'number') {
			// date lookup
		} else if (isNumber) {
			// index / minedInBlockIndex
		} else {
			// data lookup?
		}
	

	} catch(error) {
		console.log("error searching for data!", error.message)
		result.error = "error searching for data! " + error.message;
	}

	return result;
};

export const hexPattern = /^(0[xX])?[a-fA-F0-9]+$/;
export const hexCheck = (string) => {
	return hexPattern.test(string);
};
