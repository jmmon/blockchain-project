import { component$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';

export default component$(() => {
	const location = useLocation();
	const searchTerms = location.params.query.replaceAll('+', ' ');

	return (
		<div>
			<h1>Search Results</h1>
			{searchTerms}
		</div>
	);
});


export const onGet: RequestHandler<any> = async ({request, params}) => {
	// do some sorting and fetching of the data?
	console.log({request, params});
	
	return {
		value: true
	}
}