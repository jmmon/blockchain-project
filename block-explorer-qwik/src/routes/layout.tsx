import { component$, Slot, useContextProvider, useStore, useWatch$ } from '@builder.io/qwik';
import { SessionContext } from '~/libs/context';
import Footer from '../components/footer/footer';
import Header from '../components/header/header';

export default component$(() => {
	const session = useStore({
		port: 5555,
	}, {recursive: true});

	useContextProvider(SessionContext, session);

	useWatch$(({track}) => {
		track(session );
		console.log('Port changed');
	})

  return (
    <div>
      <Header />
      <main>
        <Slot />
      </main>
      <Footer />
    </div>
  );
});


