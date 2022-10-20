import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';
import { getTransactions } from '~/routes/layout';
import Transaction from "../../../components/transaction/transaction";

export default component$(() => {
	const session = useContext(SessionContext);

	const confirmedTransactionsResource = useResource$(({ track, cleanup }) => {
		track(session, "port");

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.baseUrl}${session.port}/transactions/pending`
		return getTransactions(urlString, controller);
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