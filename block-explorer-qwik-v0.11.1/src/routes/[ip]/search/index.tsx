import { component$, Resource } from '@builder.io/qwik';
import { useEndpoint, useLocation } from '@builder.io/qwik-city';

interface iEndpoint {
	value: Boolean;
	results: Object;
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
					console.log({results});
					return (
					<div>
						{results &&
							Object.entries(results).map(([key, val]) => (
								<div>
									{key}: {(typeof val === "object") ? Object.entries(val).join(', ') : val}
									
								</div>
							))}
					</div>
				)}}
			/>
		</div>
	);
});

export const onGet: RequestHandler<iEndpoint> = async ({ request, response, url, params }) => {
	const query = url.searchParams.get("query");
	console.log('query:', query);
	// do some sorting and fetching of the data?


	const results = {item1: `results for term: ${query}`}
	return {
		value: true,
		results,
	};
};
