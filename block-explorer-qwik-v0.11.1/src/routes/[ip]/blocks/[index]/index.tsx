import {
	component$,
	Resource,
	useContext,
	useResource$,
} from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';
import Block from '../../../components/block/block';

export interface iBlock {
	index: number;
	transactions: iTransaction[];
	difficulty: number;
	prevBlockHash: string;
	minedBy: string;
	blockDataHash: string;

	nonce: number | undefined;
	dateCreated: number | undefined;
	blockDataHash: string | undefined;
}

export default component$(() => {
	const { params } = useLocation();
	const session = useContext(SessionContext);

	const blockResource = useResource$<iBlock>(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.host}${session.port}/blocks/${params.index}`;
		return getBlock(urlString, controller);
	});

	return (
		<div>
			<h1>Block #{params.index}:</h1>
			<Resource
				value={blockResource}
				onPending={() => (
					<div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">
						Loading...
					</div>
				)}
				onRejected={(error) => <>Error: {error.errorMsg}</>}
				onResolved={(block) => <Block block={block} />}
			/>
		</div>
	);
});

export async function getBlock(
	urlString: String,
	controller?: AbortController
): Promise<iBlock> {
	console.log('Fetching block...');
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});
	const responseJson = await response.json();
	console.log('json:', responseJson);
	if (responseJson.errorMsg) return Promise.reject(responseJson);
	return responseJson;
}

export const head: DocumentHead = {
	title: 'A Block',
};
