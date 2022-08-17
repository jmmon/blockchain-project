import { component$, Resource } from "@builder.io/qwik";
import {
	DocumentHead,
	RequestHandler,
	useEndpoint,
	useLocation,
} from "@builder.io/qwik-city";
import Transaction from "../../../../components/transaction/transaction";

export default component$(() => {
	const { params } = useLocation();
	const resource = useEndpoint<typeof onGet>();

	return (
		<div>
			<h1>address transactions</h1>
			<p> fetch transactions of address {params.address}</p>
			<Resource
				resource={resource}
				onPending={() => (
					<div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">
						Loading...
					</div>
				)}
				onResolved={(data) => {
					const { address, transactions } = data;
					const totalTransactions = transactions.length;
					if (totalTransactions === 0) {
						return <p>No transactions found for this address.</p>;
					}

					return (
						<>
							<h4>Transactions:</h4>
							<ul>
								{transactions.map((transaction, index) => (
									<li>
										<Transaction
											transaction={transaction}
											index={index}
											totalTransactions={
												totalTransactions
											}
										/>
									</li>
								))}
							</ul>
						</>
					);
				}}
			/>
		</div>
	);
});

export const head: DocumentHead = {
	title: "transactions of this address",
};

export const onGet: RequestHandler<EndpointData> = async ({
	params,
	response,
}) => {
	const data = await getTransactions(params.address);
	if (data.errorMsg) {
		response.status = 404;
		return data.errorMsg;
	}

	response.headers.set("Cache-Control", "no-cache, no-store");
	return data;
};

export async function getTransactions(
	address: string,
	controller?: AbortController
): Promise<Object> {
	console.log("fetching transactions of address", address + "...");
	const response = await fetch(
		`http://localhost:5555/address/${address}/transactions`,
		{
			signal: controller?.signal,
		}
	);

	const responseJson = await response.json();
	console.log("json:", responseJson);

	if (responseJson.errorMsg) {
		return Promise.reject(responseJson);
	}
	return responseJson;
}
