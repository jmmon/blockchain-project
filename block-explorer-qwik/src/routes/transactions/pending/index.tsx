import { component$, Resource, useResource$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import Transaction from "../../../components/transaction/transaction";

export default component$(() => {
	const pendingTransactionsResource = useResource$(({ track, cleanup }) => {
		const controller = new AbortController();
		cleanup(() => controller.abort());

		return getPendingTransactions(controller);
	});
  return (
    <div>
      <h1>Pending Transactions</h1>
			<Resource 
				resource={pendingTransactionsResource}
				onPending={() => <p>Loading...</p>}
				onResolved={(transactions) => {
					if (transactions.length === 0) return <p>No pending transactions found.</p>;

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
  title: 'Pending Transactions',
};

export async function getPendingTransactions(
	controller?: AbortController
): Promise<Object> {
	console.log("Fetching pending transactions...");
	const response = await fetch(`http://localhost:5555/transactions/pending`, {
		signal: controller?.signal,
	});
	const responseJson = await response.json();
	console.log("json:", responseJson);
	if (responseJson.errorMsg) return Promise.reject(responseJson);
	return responseJson;
}