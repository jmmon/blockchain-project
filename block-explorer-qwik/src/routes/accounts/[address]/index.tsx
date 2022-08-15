import { component$ } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';

export default component$(() => {
	const { params } = useLocation();
  return (
    <div>
      <h1>Account: {params.account}</h1>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Accounts',
};
