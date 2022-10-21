import {
	component$,
	Resource,
	useContext,
	useResource$,
} from '@builder.io/qwik';
import {
	DocumentHead,
	Link,
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

		const urlString = `${constants.baseUrl}${session.port}/info`;
		console.log({ urlString });
		return getInfo(urlString, controller);
	});

	return (
		<div>
			<h1>Blockchain Info</h1>
			<p>
				<Link href="/info/peers">Peers</Link> and difficulty, etc
			</p>
			<Resource
				value={resource}
				onPending={() => (
					<div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">
						Loading...
					</div>
				)}
				onResolved={(info) => {
					if (!info) {
						return <p>No transaction found.</p>;
					}

					return (
						<>
							<h4>Blockchain Difficulty:</h4>
							<p class="ml-4">{info['currentDifficulty']}</p>
							<div class="mt-4">
								<h5>All Blockchain Info:</h5>
								<ul class="ml-2">
									{'{'}
									{Object.keys(info).map((key) => {
										const data = (
											<>
												{key}: {info[key]}
											</>
										);
										return (
											<li class="ml-4">
												{key === 'blocksCount' ? (
													<Link href="/blocks">
														{data}
													</Link>
												) : key === 'chainId' ? (
													<Link href="/blocks/0">
														{data}
													</Link>
												) : key === 'peers' ? (
													<Link href="/info/peers">
														{data}
													</Link>
												) : key ===
												  'pendingTransactions' ? (
													<Link href="/transactions/pending">
														{data}
													</Link>
												) : key ===
												  'confirmedTransactions' ? (
													<Link href="/transactions/confirmed">
														{data}
													</Link>
												) : (
													<>{data}</>
												)}
											</li>
										);
									})}
									{'}'}
								</ul>
							</div>
						</>
					);
				}}
			/>
		</div>
	);
});

export const head: DocumentHead = {
	title: 'Blockchain Info',
};

export async function getInfo(
	urlString: String,
	controller?: AbortController
): Promise<Object> {
	console.log('Fetching info...');
	const response = await fetch(urlString, { signal: controller?.signal });
	const responseJson = await response.json();
	console.log('json:', responseJson);

	if (responseJson.errorMsg) {
		return Promise.reject(responseJson);
	}
	return responseJson;
}
