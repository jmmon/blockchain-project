import {
	component$,
	Resource,
	useContext,
	useResource$,
} from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';

export default component$(() => {
	const session = useContext(SessionContext);
	const blocksResource = useResource$(({ track, cleanup }) => {
		// track(session, "port");
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.baseUrl}${session.port}/blocks`;
		console.log({ urlString });
		return getBlocks(urlString, controller);
	});

	console.log('render');
	return (
		<div>
			<h1>Get Blocks</h1>
			<Resource
				value={blocksResource}
				onPending={() => (
					<div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">
						Loading...
					</div>
				)}
				onRejected={(error) => <>Error: {error.message}</>}
				onResolved={(blocks) => (
					<ul>
						{blocks.map((block, index) => (
							<li>
								<a href={`/blocks/${index}`}>Block #{index}</a>
							</li>
						))}
					</ul>
				)}
			/>
		</div>
	);
});

export const head: DocumentHead = {
	title: 'Blocks',
};

export async function getBlocks(
	urlString: String,
	controller?: AbortController
): Promise<string[]> {
	console.log(`Fetching blocks from ${urlString}...`);
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});

	const json = await response.json();

	return Array.isArray(json)
		? json.map((block) => JSON.stringify(block))
		: Promise.reject(json);
}