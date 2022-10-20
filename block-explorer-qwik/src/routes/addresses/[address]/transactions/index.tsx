import { component$, Resource, useResource$, useStore } from "@builder.io/qwik";
import {
	DocumentHead,
	RequestHandler,
	useEndpoint,
	useLocation,
} from "@builder.io/qwik-city";
import constants from "~/libs/constants";
import { SessionContext } from "~/libs/context";
import Transaction from "../../../../components/transaction/transaction";

export default component$(() => {
	const { params } = useLocation();
	const session = useStore(SessionContext);

	const resource = useResource$(({ track, cleanup }) => {
		track(session, "port");

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.baseUrl}${session.port}/address/${params.address}/transactions`;
		return getAddressTransactions(urlString, params.address, controller, );
	});

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

export async function getAddressTransactions(
	urlString: string,
	address: string,
	controller?: AbortController
): Promise<Object> {
	console.log("fetching transactions of address", address + "...");
	const response = await fetch(urlString,	{
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
