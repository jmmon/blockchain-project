import { component$, useServerMount$, useStore } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import fromBuffer from '~/libs/fromBuffer';

export default component$(
	({
		transaction,
		index,
		totalTransactions,
	}: {
		transaction: ITransaction;
		index?: number;
		totalTransactions?: number;
	}) => {
		const { pathname } = useLocation();

		const store = useStore({
			txDataHash: '',
		});

		useServerMount$(async () => {
			store.txDataHash = await fromBuffer(transaction.transactionDataHash)
		})
		const paths = pathname.split('/');
		console.log({ paths });
		const isTransactionsPath =
			paths[1] === 'transactions' &&
			paths[2] !== 'pending' &&
			paths[2] !== 'confirmed';
		// const isTransactionsPath = (pathname.substring(1).substring(0, pathname.substring(1).indexOf("/")) === "transactions");
		// console.log({isTransactionsPath});

		let last = true;
		if (totalTransactions) {
			last = !(index < totalTransactions - 1);
		}

		return (
			<ul class="ml-2">
				{`${typeof index === 'number' ? `${index}: ` : ''}{`}
				{Object.keys(transaction).map((txKey) => {
					if (txKey === 'from' || txKey === 'to') {
						return (
							<li class="ml-4">
								<Link href={`/addresses/${transaction[txKey]}`}>
									{txKey}: {transaction[txKey]}
								</Link>
								,
							</li>
						);
					}
					if (txKey === 'minedInBlockIndex') {
						return (
							<li class="ml-4">
								<Link href={`/blocks/${transaction[txKey]}`}>
									{txKey}: {transaction[txKey]}
								</Link>
								,
							</li>
						);
					}
					if (txKey === 'transactionDataHash') {
						const path = isTransactionsPath
							? '#'
							: `/transactions/${store.txDataHash}`;
						return (
							<li class="ml-4">
								<Link href={path}>
									{txKey}: {store.txDataHash}
								</Link>
								,
							</li>
						);
					}
					if (txKey === 'transferSuccessful') {
						return (
							<li class="ml-4">
								{txKey}: {transaction[txKey] ? 'true' : 'false'}
								,
							</li>
						);
					}
					if (txKey === 'senderSignature') {
						return (
							<li class="ml-4">
								{`${txKey}: [`}
								<ul class="ml-4">
									<li class="ml-4">
										a: {transaction[txKey][0]},
									</li>
									<li class="ml-4">
										b: {transaction[txKey][1]},
									</li>
								</ul>
								{'],'}
							</li>
						);
					}
					return (
						<li class="ml-4">
							{txKey}: {transaction[txKey]},
						</li>
					);
				})}
				{`}${last ? '' : ','}`}
			</ul>
		);
	}
);
