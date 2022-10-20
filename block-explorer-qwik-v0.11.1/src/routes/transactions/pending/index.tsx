import {
	component$,
	Resource,
	useContext,
	useResource$,
} from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import Transaction from '../../../components/transaction/transaction';
import { SessionContext } from '~/libs/context';
import constants from '~/libs/constants';
import { getTransactions } from '~/routes/transactions/index';

export default component$(() => {
	const session = useContext(SessionContext);
	const pendingTransactionsResource = useResource$(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.baseUrl}${session.port}/transactions/pending`;
		return getTransactions(urlString, controller);
	});
	return (
		<div>
			<h1>Pending Transactions</h1>
			<Resource
				value={pendingTransactionsResource}
				onPending={() => <p>Loading...</p>}
				onResolved={(transactions) => {
					if (transactions.length === 0)
						return <p>No pending transactions found.</p>;

					const totalTransactions = transactions.length;
					return (
						<>
							{transactions.map((transaction, index) => {
								return (
									<Transaction
										transaction={transaction}
										index={index}
										totalTransactions={totalTransactions}
									/>
								);
							})}
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
