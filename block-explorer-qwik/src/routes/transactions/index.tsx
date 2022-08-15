import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div>
      <h1>Transactions</h1>
			<div class="ml-4 mt-4 flex flex-col">
				<a href="/transactions/pending">
					Pending Transactions
				</a>
				<a href="/transactions/confirmed">
					Confirmed Transactions
				</a>
			</div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Transactions',
};
