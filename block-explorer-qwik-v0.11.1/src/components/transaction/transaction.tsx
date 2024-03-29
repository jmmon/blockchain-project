import { component$, useContext, useServerMount$, useStore } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { SessionContext } from '~/libs/context';
import fromBuffer from '~/libs/fromBuffer';

export interface iTransaction {
	from: string;
	to: string;
	value: number;
	fee: number;
	dateCreated: string;
	data: string;
	senderPubKey: string;
	transactionDataHash: string;
	senderSignature: Array<string>;

	minedInBlockIndex: number | undefined;
	transferSuccessful: boolean | undefined;
}

export default component$(
	({
		transaction,
		index,
		totalTransactions,
	}: {
		transaction: iTransaction;
		index?: number;
		totalTransactions?: number;
	}) => {
		const { pathname } = useLocation();
		const session = useContext(SessionContext);

		const store = useStore({
			txDataHash: '',
		});

		// to
		useServerMount$(async () => {
			// console.log({before: transaction.transactionDataHash});
			store.txDataHash = await fromBuffer(transaction.transactionDataHash)
			// console.log({after: store.txDataHash});
		})

		const paths = pathname.split('/');
		// console.log({ paths });
		const isTransactionsPath =
			// typeof +paths[1] === 'number' &&
			paths[2] === 'transactions' &&
			paths[3] !== 'pending' &&
			paths[3] !== 'confirmed';

		let last = true;
		if (totalTransactions) {
			last = !(index < totalTransactions - 1);
		}

		return (
			<ul>
{/* 				{`${typeof index === 'number' ? `${index}: ` : ''}{`} */}
				{Object.keys(transaction).map((txKey) => {
					if (txKey === 'from' || txKey === 'to') {
						return (
							<li>
								<Link href={`/${session.port}/addresses/${transaction[txKey]}`}>
									{txKey}: {transaction[txKey]}
								</Link>
								,
							</li>
						);
					}
					if (txKey === 'minedInBlockIndex') {
						return (
							<li>
								<Link href={`/${session.port}/blocks/${transaction[txKey]}`}>
									{txKey}: {transaction[txKey]}
								</Link>
								,
							</li>
						);
					}
					if (txKey === 'transactionDataHash') {
						// if we're in /transactions/{hash}, link to the same page
						const path = isTransactionsPath
							? '#'
							: `/${session.port}/transactions/${store.txDataHash}`;
						return (
							<li>
								<Link href={path}>
									{txKey}: {store.txDataHash}
								</Link>
								,
							</li>
						);
					}
					if (txKey === 'transferSuccessful') {
						return (
							<li>
								{txKey}: {transaction[txKey] ? 'true' : 'false'}
								,
							</li>
						);
					}
					if (txKey === 'senderSignature') {
						return (
							<li>
								{`${txKey}: [`}
								<ul>
									<li>
										a: {transaction[txKey][0]},
									</li>
									<li>
										b: {transaction[txKey][1]},
									</li>
								</ul>
								{'],'}
							</li>
						);
					}
					return (
						<li>
							{txKey}: {transaction[txKey]},
						</li>
					);
				})}
{/* 				{`}${last ? '' : ','}`} */}
			</ul>
		);
	}
);
