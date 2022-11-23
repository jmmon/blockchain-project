import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import { iTransaction } from '~/components/transaction/transaction';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';
import { getTransactions } from '~/routes/[ip]/transactions/index';
import Transaction from '~/components/transaction/transaction';
import { Loading } from '~/components/loading/loading';

export default component$(() => {
	const session = useContext(SessionContext);

	const confirmedTransactionsResource = useResource$<Array<iTransaction>>(
		({ track, cleanup }) => {
			track(() => session.port);

			const controller = new AbortController();
			cleanup(() => controller.abort());

			const urlString = `${constants.host}${session.port}/transactions/confirmed`;
			return getTransactions(urlString, controller) as Array<iTransaction>;
		}
	);
	return (
		<div>
			<h1>Confirmed Transactions</h1>
			<Resource
				value={confirmedTransactionsResource}
				onPending={() => (
					<>
						<Loading path="transaction" />
					</>
				)}
				onRejected={(error) => <p>Error: {error.message}</p>}
				onResolved={(transactions) => {
					if (!transactions) return <p>No confirmed transactions found.</p>;

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
	title: 'Confirmed Transactions',
};
