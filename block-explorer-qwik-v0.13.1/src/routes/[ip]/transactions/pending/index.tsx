import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import Transaction from '~/components/transaction/transaction';
import { SessionContext } from '~/libs/context';
import constants from '~/libs/constants';
import { getTransactions } from '~/routes/[ip]/transactions/index';
import { iTransaction } from '~/components/transaction/transaction';
import { Loading } from '~/components/loading/loading';

export default component$(() => {
	const session = useContext(SessionContext);
	const pendingTransactionsResource = useResource$<Array<iTransaction>>(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.host}${session.port}/transactions/pending`;
		return getTransactions(urlString, controller) as Array<iTransaction>;
	});

	return (
		<div>
			<h1>Pending Transactions</h1>
			<Resource
				value={pendingTransactionsResource}
				onPending={() => (
					<>
						<Loading path="transaction" />
					</>
				)}
				onRejected={(error) => <p>Error: {error.message}</p>}
				onResolved={(transactions) => {
					if (transactions.length === 0) return <p>No pending transactions found.</p>;

					const totalTransactions = transactions.length;

					return transactions.map((transaction, index) => {
						const isLast = index == transactions.length - 1;
						return (
							<details>
								<summary
									style={{
										cursor: 'pointer',
										listStyle: 'none',
									}}
								>
									{index}:{' {'}
									<span class="extra">
										<br />. . .<br />
										{isLast ? '}' : '},'}
									</span>
								</summary>{' '}
								<Transaction
									transaction={transaction}
									totalTransactions={transactions.length}
								/>
								{isLast ? '}' : '},'}
							</details>
						);
					});
				}}
			/>
		</div>
	);
});

export const head: DocumentHead = {
	title: 'Pending Transactions',
};
