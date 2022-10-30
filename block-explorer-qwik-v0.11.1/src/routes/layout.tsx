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
	const location = useLocation();
	console.log('layout', { location });


	useWatch$(({ track }) => {
		// track(() => session.port);
		track(() => location.pathname);
		const port = location.pathname.split('/')[1];
		console.log({port});
		if (typeof port === 'number') {
			console.log({ port });
			session.port = port;

			console.log('Port changed');
		}
	});

	console.log({ session });
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
					Made with ♡ by Builder.io
				</a>
			</footer>
		</>
	);
});
