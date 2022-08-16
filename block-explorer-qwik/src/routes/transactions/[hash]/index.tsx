import { component$, Resource } from '@builder.io/qwik';
import { DocumentHead, RequestHandler, useEndpoint, useLocation } from '@builder.io/qwik-city';

export default component$(() => {
	const {params} = useLocation();
	const resource = useEndpoint<typeof onGet>();
  return (
    <div>
      <h1>Transaction Lookup</h1>
			<Resource 
				resource={resource}
				onPending={() => <p>Loading...</p>}
				onResolved={(transaction) => {
					if (!transaction) {
						return <p>No transaction found.</p>
					}

					return (
						<>
						<h4>{`Hash: ${params.hash}:`}</h4>
						<ul class="ml-2">{"{"}
							{Object.keys(transaction).map((txKey) => {
								if (txKey === 'transferSuccessful') {
									return (<li class="ml-4">{txKey}: {transaction[txKey] ? "true" : "false"},</li>)
									
								}
								if (txKey === 'senderSignature') {
									return (<li class="ml-4">{`${txKey}: [`}
										<ul class="ml-4">
											<li class="ml-4">a: {transaction[txKey][0]},</li>
											<li class="ml-4">b: {transaction[txKey][1]},</li>
										</ul>
									{"],"}</li>
									)
								}
								return (<li class="ml-4">{txKey}: {transaction[txKey]},</li>)
							})}
						{"}"}</ul>
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

export const onGet: RequestHandler<EndpointData> = async ({params, response}) => {
	const data = await getTransaction(params.hash);
	if (data.errorMsg) {
		response.status = 404;
		return data.errorMsg;
	}

	response.headers.set('Cache-Control', 'no-cache, no-store, no-fun');
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

let Signature: string;

type Transaction = {
	from: string;
	to: string;
	value: number;
	fee: number;
	dateCreated: string;
	data: string;
	senderPubKefy: string;
	transactionDataHash: string;
	senderSignature: Array<Signature>;
	minedInBlockIndex: number;
	transferSuccessful: boolean;
};