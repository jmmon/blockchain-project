import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import { DocumentHead, RequestHandler, useEndpoint } from '@builder.io/qwik-city';
import { Loading } from '~/components/loading/loading';
import constants from '~/libs/constants';
import { iPeer, SessionContext } from '~/libs/context';

export default component$(() => {
	const session = useContext(SessionContext);
	const resource = useResource$<Array<iPeer>>(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.host}${session.port}/peers`;
		return getPeers(urlString, controller);
	});

	return (
		<>
			<h4>Peers</h4>
			<Resource
				value={resource}
				onPending={() => (
					<>
						<Loading path="info" />
					</>
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
							<ol>
								[
								{peers.map(([id, url]) => {
									// get url
									const port = url.split(':')[2];
									console.log({ url, port });
									return (
										<li>
											<a href={`/${port}/info/peers`}>
												{id}: {url}
											</a>
										</li>
									);
								})}
								]
							</ol>
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
): Promise<Array<iPeer>> {
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
