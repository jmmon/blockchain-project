import { component$, useContext, useStylesScoped$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { SessionContext } from '~/libs/context';

export default component$(() => {
	const session = useContext(SessionContext);
	useStylesScoped$(`
	ul.dots>li {
		list-style-type: "-";
		padding-left: 0.75rem;
	}
	ul.dots>li::marker {
		color: var(--qwik-light-blue);
	}
	`);
	return (
		<div>
			<h1>Welcome to My Block Explorer!</h1>

			<p>
				Use this tool to view information on the blockchain. Browse blocks, addresses,
				transactions, etc.
			</p>
			<p>
				This block explorer is connected to the node running on port 5555 by default. While
				all nodes on the network should remain in sync, you may switch this block explorer
				to any peer connected to this node by selecting a peer on the{' '}
				<a href={`/${session.port}/info/peers`}>Blockchain Peers</a> page.
			</p>
			<h2>Available information:</h2>
			<ul class="dots">
				<li>
					<a href={`/${session.port}/info`}>Info</a>
				</li>
				<li>
					<a href={`/${session.port}/info/peers`}>Peers</a>
				</li>
				<li>
					<a href={`/${session.port}/blocks`}>Blocks</a>
				</li>
				<li>
					<a href={`/${session.port}/transactions/pending`}>Pending Transactions</a>
				</li>
				<li>
					<a href={`/${session.port}/transactions/confirmed`}>Confirmed Transactions</a>
				</li>
				<li>
					<a href={`/${session.port}/addresses`}>Balances of Addresses</a>
				</li>
				<li>
					<a href={`/${session.port}/addresses`}>Balances of Addresses</a>
				</li>
				<li>
					Along with looking at a specific transaction, a specific block, a specific
					address's balances, and a specific address's transactions!
				</li>
			</ul>
		</div>
	);
});

export const head: DocumentHead = {
	title: 'Welcome to My Block Explorer',
};
