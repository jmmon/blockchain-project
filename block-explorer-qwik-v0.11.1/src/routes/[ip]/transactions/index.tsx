import { component$, useContext } from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { iTransaction } from '~/components/transaction/transaction';
import { SessionContext } from '~/libs/context';

export default component$(() => {
	const session = useContext(SessionContext);
	return (
		<div>
			<h1>Transactions</h1>
			<div class="ml-4 mt-4 flex flex-col">
				<a href={ `/${session.port}/transactions/pending` } >Pending Transactions</a>
				<a href={ `/${session.port}/transactions/confirmed` } >Confirmed Transactions</a>
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
): Promise<iTransaction|Array<iTransaction>> {
	console.log(`Fetching transactions from ${urlString}...`);
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});

	const responseJson = await response.json();
	console.log('json:', responseJson);

	if (responseJson.errorMsg) return Promise.reject(responseJson);
	return responseJson;
}
