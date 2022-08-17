import { component$ } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";

export default component$(() => {
	const {params} = useLocation();

	return (
		<div>
			<h1>address transactions</h1>
			<p> fetch transactions of this address </p>
			<p>
				Params: {
					Object.entries(params).map(([key, value]) => (<div>{key}: {value}</div>)) ?? (<div>No params?</div>)
				}
			</p>
		</div>
	);
});

export const head: DocumentHead = {
	title: 'transactions of this address',
};