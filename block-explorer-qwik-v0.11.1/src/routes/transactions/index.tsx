import { component$ } from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';

export default component$(() => {
	return (
		<div>
			<h1>Transactions</h1>
			<div class="ml-4 mt-4 flex flex-col">
				<Link href="/transactions/pending">Pending Transactions</Link>
				<Link href="/transactions/confirmed">Confirmed Transactions</Link>
			</div>
		</div>
	);
});

export const head: DocumentHead = {
	title: 'Transactions',
};

export async function getTransactions(
	urlString: String,
	controller?: AbortController
): Promise<Object> {
	console.log(`Fetching transactions from ${urlString}...`);
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});

	const responseJson = await response.json();
	console.log('json:', responseJson);

	if (responseJson.errorMsg) return Promise.reject(responseJson);
	return responseJson;
}
