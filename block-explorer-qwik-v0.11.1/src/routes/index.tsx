import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
	return (
		<div>
			<h1>Welcome to My Block Explorer!</h1>

			<p>
				Connects to local blockchain nodes. See the port number dropdown
				at the top of the page easily check different nodes.
			</p>
		</div>
	);
});

export const head: DocumentHead = {
	title: 'Welcome to My Block Explorer',
};
