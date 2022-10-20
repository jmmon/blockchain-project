import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';
import { getTransactions } from '~/routes/layout';

import Transaction from '../../../components/transaction/transaction';

export default component$(() => {
	const session = useContext(SessionContext);
	const {params} = useLocation();

	const transactionsResource = useResource$(({ track, cleanup }) => {
		track(session, "port");

		const controller = new AbortController();
		cleanup(() => controller.abort());
		
		const urlString = `${constants.baseUrl}${session.port}/transactions/${params.hash}`

		return getTransaction(urlString, controller);
	});
	
  return (
    <div>
      <h1>Transaction Lookup</h1>
			<Resource 
				resource={transactionsResource}
				onPending={() => <div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">Loading...</div>}
				onResolved={(transaction) => {
					if (!transaction) {
						return <p>No transaction found.</p>
					}

					return (
						<>
							<h4>{`Hash: ${params.hash}:`}</h4>
							<Transaction transaction={transaction} />
						</>
					);
				}}
			/>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Confirmed Transactions',
};


export async function getTransaction(
	urlString: String,
	controller?: AbortController
): Promise<Object> {
	console.log("Fetching transaction...");
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});
	const responseJson = await response.json();
	console.log("json:", responseJson);

	if (responseJson.errorMsg) {
		return Promise.reject(responseJson);
	}
	return responseJson;
}