import {
	component$,
	Resource,
	useContext,
	useResource$,
} from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';
import { getTransactions } from '~/routes/transactions/index';

import Transaction from '../../../components/transaction/transaction';

export default component$(() => {
	const session = useContext(SessionContext);
	const { params } = useLocation();

	const transactionsResource = useResource$(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.baseUrl}${session.port}/transactions/${params.hash}`;

		return getTransactions(urlString, controller);
	});

	return (
		<div>
			<h1>Transaction Lookup</h1>
			<Resource
				value={transactionsResource}
				onPending={() => (
					<div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">
						Loading...
					</div>
				)}
				onResolved={(transaction) => {
					if (!transaction) {
						return <p>No transaction found.</p>;
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
