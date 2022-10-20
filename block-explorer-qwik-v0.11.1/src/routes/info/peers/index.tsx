import {
	component$,
	Resource,
	useContext,
	useResource$,
} from '@builder.io/qwik';
import {
	DocumentHead,
	RequestHandler,
	useEndpoint,
} from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';

export default component$(() => {
	const session = useContext(SessionContext);
	const resource = useResource$(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.baseUrl}${session.port}/peers`;
		return getPeers(urlString, controller);
	});

	return (
		<>
			<h4>Peers</h4>
			<Resource
				value={resource}
				onPending={() => (
					<div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">
						Loading...
					</div>
				)}
				onRejected={(error) => {
					console.log('onRejected', { error });
					if (typeof peers === 'string') {
						return <p>Error: {peers}</p>;
					}
					if (peers.length === 0) {
						return <p>No peers found.</p>;
					}
				}}
				onResolved={(peers) => {
					console.log({ peers });
					if (typeof peers === 'string') {
						return <p>Error: {peers}</p>;
					}
					if (peers.length === 0) {
						return <p>No peers found.</p>;
					}

					return (
						<>
							<h4>Peers:</h4>
							<ul class="ml-2">
								[
								{peers.map((peer) => (
									<li>{peer}</li>
								))}
								]
							</ul>
						</>
					);
				}}
			/>
		</>
	);
});

export const head: DocumentHead = {
	title: 'Peers Map',
};

// onGet NEVER runs on client. If I want to run on client, do useResource$ (in our component) and fetch inside

export async function getPeers(
	urlString: String,
	controller?: AbortController
): Promise<Object> {
	console.log('fetching peers...', { urlString });
	try {
		const response = await fetch(urlString, {
			signal: controller?.signal,
		});
		const responseJson = await response.json();
		console.log('json:', responseJson);

		if (responseJson.errorMsg) {
			return Promise.reject(responseJson);
		}
		return responseJson;
	} catch (error) {
		console.log('error caught');
		return Promise.reject(error);
	}
}
