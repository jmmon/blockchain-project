import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div>
      <h1>Blockchain Info</h1>
      <p>Peers and difficulty, etc</p>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Blockchain Info',
};
