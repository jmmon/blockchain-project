import { component$, Slot, useContextProvider, useStore, useWatch$ } from '@builder.io/qwik';
import { SessionContext } from '~/libs/context';
import Header from '../components/header/header';

export default component$(() => {
	const session = useStore({port: 5555});
	useContextProvider(SessionContext, session);
	useWatch$(({track}) => {
		track(() => session.port);
		console.log('Port changed');
	})
  return (
    <>
      <main>
        <Header />
        <section>
          <Slot />
        </section>
      </main>
      <footer>
        <a href="https://www.builder.io/" target="_blank">
          Made with ♡ by Builder.io
        </a>
      </footer>
    </>
  );
});
