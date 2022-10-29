import { component$, Resource } from '@builder.io/qwik';
import { useEndpoint, useLocation } from '@builder.io/qwik-city';

interface IEndpoint {
	value: Boolean;
}

export default component$(() => {
	const location = useLocation();
	// const searchTerms = location.params.query.replaceAll('+', ' ');
	const searchData = useEndpoint<IEndpoint>();

	console.log({ searchData });

	console.log('inside component:', { location });
	return (
		<div>
			<h1>Search Results</h1>
			<Resource
				value={searchData}
				onPending={() => <div>Loading...</div>}
				onRejected={() => <div>Error</div>}
				onResolved={(data) => (
					<div>
						{data && Object.entries(data).map(([key, val]) => (
							<div>
								{key}: {val}
							</div>
						))}
					</div>
				)}
			/>
			{/* {searchTerms} */}
		</div>
	);
});

export const onGet: RequestHandler<IEndpoint> = async ({ request, params }) => {
	// do some sorting and fetching of the data?
	console.log('onGet:', { request, params });
	// console.log('onGet:', {
	// 	// params: await request.formData(),
	// 	// json: await request.json(),
	// 	// text: await request.text(),
	// });

	return {
		value: true,
		params,
	};
};
