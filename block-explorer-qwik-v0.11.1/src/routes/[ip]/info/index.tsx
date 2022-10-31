import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import { DocumentHead, Link, RequestHandler, useEndpoint } from '@builder.io/qwik-city';
import { Loading } from '~/components/loading/loading';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';

export const RenderObject = component$((obj) => {
	const keysArr = Object.keys(obj);
	return (
		<ul>
			{keysArr.map((key, index) => {
				return (
					<li>
						{key}:{' '}
						{typeof obj[key] === 'object' ? (
							<>
								{'{'} {RenderObject(obj[key])}{' '}
								{`}${keysArr.indexOf(key) !== keysArr.length - 1 ? ',' : ''}`}
							</>
						) : (
							obj[key]
						)}
					</li>
				);
			})}
		</ul>
	);
});

export default component$(() => {
	const session = useContext(SessionContext);
	const resource = useResource$(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.host}${session.port}/info`;
		console.log({ urlString });
		return getInfo(urlString, controller);
	});

	return (
		<div>
			<h1>Blockchain Info</h1>
			<p>
				<Link href={`/${session.port}/info/peers`}>Peers</Link> and difficulty, etc
			</p>
			<Resource
				value={resource}
				onPending={() => (
					<>
						<Loading path="info" />
					</>
				)}
				onResolved={(info) => {
					if (!info) {
						return <p>No transaction found.</p>;
					}

					return (
						<>
							<h4>Blockchain Difficulty:</h4>
							<p>{info['currentDifficulty']}</p>
							<div>
								<h5>All Blockchain Info:</h5>
								<ul>
									{'{'}
									{Object.keys(info).map((key) => {
										const data = (
											<>
												{key}: {info[key]}
											</>
										);
										return (
											<li>
												{key === 'blocksCount' ? (
													<Link href={`/${session.port}/blocks`}>
														{data}
													</Link>
												) : key === 'chainId' ? (
													<a href={`/${session.port}/blocks/0`}>{data}</a>
												) : key === 'peers' ? (
													<Link href={`/${session.port}/info/peers`}>
														{data}
													</Link>
												) : key === 'pendingTransactions' ? (
													<a
														href={`/${session.port}/transactions/pending`}
													>
														{data}
													</a>
												) : key === 'confirmedTransactions' ? (
													<a
														href={`/${session.port}/transactions/confirmed`}
													>
														{data}
													</a>
												) : key === 'config' ? (
													<details>
														<summary
															style={{
																cursor: 'pointer',
																listStyle: 'none',
															}}
														>
															{key}:{' {'}
															<span class="extra">
																<br />. . .<br />
																{'}'}
															</span>
														</summary>{' '}
														{RenderObject(info[key])} {'}'}
													</details>
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

export async function getInfo(urlString: String, controller?: AbortController): Promise<Object> {
	console.log('Fetching info...');
	const response = await fetch(urlString, { signal: controller?.signal });
	const responseJson = await response.json();
	console.log('json:', responseJson);

	if (responseJson.errorMsg) {
		return Promise.reject(responseJson);
	}
	return responseJson;
}
