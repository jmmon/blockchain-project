import { component$, Resource } from "@builder.io/qwik";
import { DocumentHead, RequestHandler, useEndpoint } from "@builder.io/qwik-city";

export default component$(() => {
	const resource = useEndpoint<typeof onGet>();

	return (
		<>
			<h4>Peers</h4>
			<Resource 
				resource={resource}
				onPending={() => <div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">Loading...</div>}
				onRejected={(error) => {
					console.log('onRejected', {error});
					if (typeof peers === 'string') {
						return <p>Error: {peers}</p>
					}
					if (peers.length === 0) {
						return <p>No peers found.</p>
					}	
				}}
				onResolved={(peers) => {
					console.log({peers});
					if (typeof peers === 'string') {
						return <p>Error: {peers}</p>
					}
					if (peers.length === 0) {
						return <p>No peers found.</p>
					}

					return (
						<>
							<h4>Peers:</h4>
							<ul class="ml-2">[
								{peers.map(peer => <li>{peer}</li>)}
							]</ul>
						</>
					);
				}}

			/>
		</>
	);
});

export const head: DocumentHead = {
	title: 'Peers Map',
}

// onGet NEVER runs on client. If I want to run on client, do useResource$ (in our component) and fetch inside
export const onGet: RequestHandler<EndpointData> = async ({response}) => {
	try {
		const data = await getPeers();

		response.headers.set('Cache-Control', 'no-cache, no-store');
		return data;

	} catch(error) {
		console.log('onGet catch');
		if (error.message) {
			response.status = 404;
			return error.message;
		}

		response.status = 404;
		return error.errorMsg;
	}		
}

export async function getPeers(
	controller?: AbortController
): Promise<Object> {
	console.log('fetching peers...');
	try {
		const response = await fetch('http://localhost:5555/peers', {
			signal: controller?.signal,
		});
		const responseJson = await response.json();
		console.log('json:', responseJson);
	
		if (responseJson.errorMsg) {
			return Promise.reject(responseJson);
		}
		return responseJson;

	} catch(error) {
		console.log('error caught');
		return Promise.reject(error);
	}
}

