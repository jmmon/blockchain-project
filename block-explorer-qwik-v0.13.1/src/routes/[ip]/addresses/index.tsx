import { component$, Resource, useContext, useResource$ } from '@builder.io/qwik';
import {
	DocumentHead,
	Link,
	RequestHandler,
	useEndpoint,
	useLocation,
} from '@builder.io/qwik-city';
import { Loading } from '~/components/loading/loading';
import constants, {convert} from '~/libs/constants';
import { SessionContext } from '~/libs/context';

export interface iAllBalances {
	[key: string]: number;
}

export default component$(() => {
	const session = useContext(SessionContext);
	const location = useLocation();
	console.log({ location });

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
			<h1>Addresses And Balances</h1>
			<p>A list of account balances that are non-zero amounts:</p>
			<Resource
				value={resource}
				onPending={() => (
					<>
						<Loading path="blocks" />
					</>
				)}
				onRejected={(error) => <p>Error: {error.message}</p>}
				onResolved={(balances) => {
					if (!balances) {
						return <p>Should never show</p>;
					}
					return (<>
							<h4>Balances:</h4>
							<ol>
								{Object.keys(balances).map((address) => {
									const balance = balances[address];
									const converted = convert.toCoins(balance);
/* 									console.log({balance, converted: {converted}}); */
									return (
									<li>
										<Link href={`/${session.port}/addresses/${address}`}>
											{address}
										</Link>
										: {converted.amount} {converted.type}
									</li>
									);
								})}
							</ol>
						</>
					);
				}}
			/> 
		</div>
	);
});

export const head: DocumentHead = {
	title: 'Addresses',
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
