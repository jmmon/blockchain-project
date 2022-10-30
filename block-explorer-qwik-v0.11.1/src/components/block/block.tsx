import { component$, useStylesScoped$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import Transaction from '../transaction/transaction';

export default component$(({ block }: { block: IBlock }) => {
	return (
		<ul>
			{'{'}
			{Object.keys(block).map((key) => {
				if (key === 'index') {
					return (
						<li class="ml-2">
							<a href={`#`}>
								{key}: {block[key]}
							</a>
							,
						</li>
					);
				}

				if (key === 'minedBy') {
					return (
						<li class="ml-2">
							<Link href={`/${session.port}/addresses/${block[key]}`}>
								{key}: {block[key]}
							</Link>
							,
						</li>
					);
				}

				if (key === 'transactions') {
					const transactions = block[key];
					const totalTransactions = transactions.length;
					return (
						<li class="ml-2">
							<details>
								<summary
									style={{
										cursor: 'pointer',
										listStyle: 'none',
									}}
								>
									Transactions: {'['}
									<span class="extra"><br />.{" "}.{" "}.<br/>{']'}</span>
								</summary>

								<ul class="ml-2">
									{transactions.map((transaction, index) => (
										<li>
											<Transaction
												transaction={transaction}
												index={index}
												totalTransactions={
													totalTransactions
												}
											/>
										</li>
									))}
								</ul>
							</details>
							{'],'}
						</li>
					);
				}

				return (
					<li class="ml-2">
						{key}: {block[key]},
					</li>
				);
			})}

			{'}'}
		</ul>
	);
});
