import { component$, Slot, useContext, useWatch$ } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';

export default component$(() => {
	const session = useContext(SessionContext);
	const location = useLocation();

	useWatch$(({ track }) => {
		track(() => location);

		const port = location.pathname.split('/')[1];
		console.log('useWatch port tracking:', { port });

		if (!(isNaN(port))) {
			session.port = +port;
			console.log('Port changed to', port);
		} else {
			session.port = constants.defaultPort;
			console.log('Port error, defaulting to', port);
		}
	});

	return (
		<>
			<Slot />
		</>
	);
});

export const head: DocumentHead = ({ head }) => {
	return {
		title: `${head.title} | Block Explorer`
	}
}