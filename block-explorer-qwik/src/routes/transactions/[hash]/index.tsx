import { component$, Resource } from '@builder.io/qwik';
import { DocumentHead, RequestHandler, useEndpoint, useLocation } from '@builder.io/qwik-city';

import Transaction from '../../../components/transaction/transaction';

export default component$(() => {
	const {params} = useLocation();
	const resource = useEndpoint<typeof onGet>();
  return (
    <div>
      <h1>Transaction Lookup</h1>
			<Resource 
				resource={resource}
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

// onGet: as page loads, request data along with the page from the server
// fetch: client fetches data after page loads?

// so fetch is for dynamic input, like user typing in something to a box
// onGet is for loading content after we already know what we're looking for, so the server can fetch it for us and then send it to us inside the page

export const onGet: RequestHandler<EndpointData> = async ({params, response}) => {
	const data = await getTransaction(params.hash);
	if (data.errorMsg) {
		response.status = 404;
		return data.errorMsg;
	}

	response.headers.set('Cache-Control', 'no-cache, no-store');
	return data;
}

export async function getTransaction(
	hash: string,
	controller?: AbortController
): Promise<Object> {
	console.log("Fetching transaction...");
	const response = await fetch(`http://localhost:5555/transactions/${hash}`, {
		signal: controller?.signal,
	});
	const responseJson = await response.json();
	console.log("json:", responseJson);

	if (responseJson.errorMsg) {
		return Promise.reject(responseJson);
	}
	return responseJson;
}