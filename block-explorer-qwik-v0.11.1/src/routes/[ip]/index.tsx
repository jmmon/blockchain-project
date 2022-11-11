import { component$, useContext, useStylesScoped$ } from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { SessionContext } from '~/libs/context';

export default component$(() => {
	const session = useContext(SessionContext);
	console.log('[ip] index:', {session})
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
				<Link href={`/${session.port}/info/peers`}>Blockchain Peers</Link> page.
			</p>
			<h2>Check out these things on our blockchain:</h2>
			<ul class="dots">
				<li>
					<Link href={`/${session.port}/info`}>Info</Link>
				</li>
				<li>
					<Link href={`/${session.port}/info/peers`}>Peers</Link>
				</li>
				<li>
					<Link href={`/${session.port}/blocks`}>Blocks</Link>
				</li>
				<li>
					<Link href={`/${session.port}/transactions/pending`}>Pending Transactions</Link>
				</li>
				<li>
					<Link href={`/${session.port}/transactions/confirmed`}>Confirmed Transactions</Link>
				</li>
				<li>
					<Link href={`/${session.port}/addresses`}>Balances of Addresses</Link>
				</li>
				<li>
					<Link href={`/${session.port}/addresses`}>Balances of Addresses</Link>
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
