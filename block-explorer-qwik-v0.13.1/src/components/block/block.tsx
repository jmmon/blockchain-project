import { component$, useContext, useStylesScoped$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { SessionContext } from '~/libs/context';
import Transaction from '../transaction/transaction';

export default component$(({ block }: { block: IBlock }) => {
	const session = useContext(SessionContext);
	return (
		<ul>
			{'{'}
			{Object.keys(block).map((key) => {
				if (key === 'index') {
					return (
						<li>
							<a href={`#`}>
								{key}: {block[key]}
							</a>
							,
						</li>
					);
				}

				if (key === 'minedBy') {
					return (
						<li>
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
						<li>
							<details style="margin-left: 1rem;">
								<summary
									style={{
										cursor: 'pointer',
										listStyle: 'none',
									}}
								>
									Transactions:{' ['}
									<span class="extra">
										<br />. . .<br />
										],
									</span>
								</summary>{' '}
								{transactions.map((transaction, index) => {
									const isLast = index == transactions.length - 1;
									return (
										<details
											open
											style="margin-left: 1rem;"
										>
											<summary>
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
								})}
								],
							</details>
						</li>
					);
				}

				return (
					<li>
						{key}: {block[key]},
					</li>
				);
			})}

			{'}'}
		</ul>
	);
});
