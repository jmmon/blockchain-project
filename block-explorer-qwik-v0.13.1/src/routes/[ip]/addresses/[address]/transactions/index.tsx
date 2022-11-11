import { component$, Resource, useContext, useResource$, useStylesScoped$ } from '@builder.io/qwik';
import { DocumentHead, RequestHandler, useEndpoint, useLocation } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';
import Transaction from '~/components/transaction/transaction';
import type { iTransaction } from '~/components/transaction/transaction';
import Styles from './styles.css';
import { Loading } from '~/components/loading/loading';

export default component$(() => {
	useStylesScoped$(Styles);
	const { params } = useLocation();
	const session = useContext(SessionContext);

	const resource = useResource$<iAddressTransactions>(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.host}${session.port}/address/${params.address}/transactions`;
		return getAddressTransactions(urlString, params.address, controller);
	});

	return (
		<div>
			<h1>address transactions</h1>
			<p> fetch transactions of address {params.address}</p>
			<Resource
				value={resource}
				onPending={() => (
					<>
						<Loading path="blocks" />
					</>
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
									<li class="transactionsMap">
										<details class="transactionsMap">
											<summary>
												Tx #{index}
												<span>. . .</span>
											</summary>

											<Transaction
												transaction={transaction}
												totalTransactions={totalTransactions}
											/>
										</details>
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
	title: 'transactions of this address',
};

export async function getAddressTransactions(
	urlString: string,
	address: string,
	controller?: AbortController
): Promise<iAddressTransactions> {
	console.log('fetching transactions of address', address + '...');
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});

	const responseJson = await response.json();
	console.log('json:', responseJson);

	if (responseJson.errorMsg) {
		return Promise.reject(responseJson);
	}
	return responseJson;
}

export interface iAddressTransactions {
	address: string;
	transactions: Array<iTransaction>;
}
