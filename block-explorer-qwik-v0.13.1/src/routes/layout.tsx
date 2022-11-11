import {
	component$,
	Slot,
	useClientEffect$,
	useContextProvider,
	useStore,
	useWatch$,
} from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { iSessionContext, SessionContext } from '~/libs/context';
import Header from '../components/header/header';
import { getPeers } from './[ip]/info/peers';

export default component$(() => {
	const session = useStore<iSessionContext>({
		port: constants.defaultPort,
		peers: [],
		searchForPeers: true,
	});

	useContextProvider(SessionContext, session);


	return (
		<>
			<main>
				<Header />
				<section>
					<Slot />
				</section>
			</main>
			<footer>
				<a
					href="https://www.builder.io/"
					target="_blank"
				>
					Qwik: Made with ♡ by Builder.io
				</a>
			</footer>
		</>
	);
});


