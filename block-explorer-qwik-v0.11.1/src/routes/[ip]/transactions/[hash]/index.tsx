import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import { iTransaction } from '~/components/transaction/transaction';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';
import { getTransactions } from '~/routes/[ip]/transactions/index';

import Transaction from '~/components/transaction/transaction';
import { Loading } from '~/components/loading/loading';

export default component$(() => {
	const session = useContext(SessionContext);
	const { params } = useLocation();

	const transactionsResource = useResource$<iTransaction>(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.host}${session.port}/transactions/${params.hash}`;

		return getTransactions(urlString, controller);
	});

	return (
		<div>
			<h1>Transaction Lookup</h1>

			<Resource
				value={transactionsResource}
				onPending={() => (
					<>
						<Loading path="transaction" />
					</>
				)}
				onRejected={(reason) => <div>Error: {reason.errorMsg}</div>}
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
	title: 'Find Transaction By Hash',
};
