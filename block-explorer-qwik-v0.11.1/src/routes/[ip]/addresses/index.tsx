import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import {
	DocumentHead,
	Link,
	RequestHandler,
	useEndpoint,
	useLocation,
} from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';


export interface iAllBalances {
	[key: string]: number;
}

export default component$(() => {
	const session = useContext(SessionContext);
	const location = useLocation();
	console.log({location})

	const resource = useResource$<iAllBalances>(({ track, cleanup }) => {
		track(() => session.port);

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.host}${session.port}/balances`;
		console.log({ urlString });
		return getAllBalances(urlString, controller);
	});

	return (
		<div>
			<h1>Addresses</h1>
			<p>fetch all (confirmed, non-zero) address balances</p>
			<Resource
				value={resource}
				onPending={() => <p>Loading...</p>}
				onResolved={(balances) => {
					if (!balances) {
						return <p>Should never show</p>;
					}

					return (
						<>
							<h4>Balances:</h4>
							<ul>
								{Object.keys(balances).map((address) => (
									<li class="ml-4">
										<Link href={`/${session.port}/addresses/${address}`} >{address}</Link>: {balances[address]}
									</li>
								))}
							</ul>
						</>
					);
				}}
			/>
		</div>
	);
});

export const head: DocumentHead = {
	title: 'Address Balances',
};

export async function getAllBalances(
	urlString: String,
	controller?: AbortController
): Promise<iAllBalances> {
	console.log('fetching ALL balances...');
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});
	const responseJson = await response.json();
	console.log('json:', responseJson);

	if (responseJson.errorMsg) {
		return Promise.reject(responseJson);
	}
	return responseJson;
}