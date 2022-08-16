import { component$, Resource, useResource$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import Transaction from "../../../components/transaction/transaction";

export default component$(() => {
	const confirmedTransactionsResource = useResource$(({ track, cleanup }) => {
		const controller = new AbortController();
		cleanup(() => controller.abort());

		return getConfirmedTransactions(controller);
	});
  return (
    <div>
      <h1>Confirmed Transactions</h1>
			<Resource 
				resource={confirmedTransactionsResource}
				onPending={() => <p>Loading...</p>}
				onResolved={(transactions) => {
					if (!transactions) return <p>No confirmed transactions found.</p>;

					const totalTransactions = transactions.length;
					return (
						<>
						{transactions.map((transaction, index) => {
							console.log({transaction, index});
							return (
							<Transaction transaction={transaction} index={index} totalTransactions={totalTransactions} />
						)})}
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

export async function getConfirmedTransactions(
	controller?: AbortController
): Promise<Object> {
	console.log("Fetching confirmed transactions...");
	const response = await fetch(`http://localhost:5555/transactions/confirmed`, {
		signal: controller?.signal,
	});
	const responseJson = await response.json();
	console.log("json:", responseJson);
	if (responseJson.errorMsg) return Promise.reject(responseJson);
	return responseJson;
}