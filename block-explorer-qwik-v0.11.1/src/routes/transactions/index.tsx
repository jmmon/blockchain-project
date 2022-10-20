import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
	return (
		<div>
			<h1>Transactions</h1>
			<div class="ml-4 mt-4 flex flex-col">
				<a href="/transactions/pending">Pending Transactions</a>
				<a href="/transactions/confirmed">Confirmed Transactions</a>
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
