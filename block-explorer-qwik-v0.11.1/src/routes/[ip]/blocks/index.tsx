import {
	component$,
	Resource,
	useContext,
	useResource$,
} from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { Loading } from '~/components/loading/loading';
import { iTransaction } from '~/components/transaction/transaction';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';


export default component$(() => {
	const session = useContext(SessionContext);
	const blocksResource = useResource$<Array<string>>(({ track, cleanup }) => {
		// track(session, "port");
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.host}${session.port}/blocks`;
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
				<><Loading path="blocks" /></>
				)}
				onRejected={(error) => <>Error: {error.message}</>}
				onResolved={(blocks) => (
					<ul>
						{blocks.map((block, index) => (
							<li>
								<Link href={`/${session.port}/blocks/${index}`}>Block #{index}</Link>
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
): Promise<Array<string>> {
	console.log(`Fetching blocks from ${urlString}...`);
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});

	const json = await response.json();

	return Array.isArray(json)
		? json.map((block) => JSON.stringify(block))
		: Promise.reject(json);
}