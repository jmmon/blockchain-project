import { component$, Resource, useResource$ } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";

export default component$(() => {
  const { params } = useLocation();
	
  // const resource = useEndpoint<typeof onGet>();

	const blockResource = useResource$(({ track, cleanup }) => {
		// const controller = new AbortController();
		// cleanup(() => controller.abort());

		return getBlock(params.index);
	});

	console.log('render');
	return (
		<div>
			<h1>Get Blocks</h1>
			<Resource
				resource={blockResource}
				onPending={() => <>Loading...</>}
				onRejected={(error) => <>Error: {error.message}</>}
				onResolved={(block) => (
					<ul>
						{Object.keys(block).map((key) => (
							<li>
								{key}: {block[key]}
							</li>
						))}
					</ul>
				)}
			/>
		</div>
	);
});

export async function getBlock(
	index: string,
	controller?: AbortController
): Promise<string[]> {
	console.log("Fetching block...");
	const response = await fetch(`http://localhost:5555/blocks/${index}`, {
		signal: controller?.signal,
	});
	console.log("fetch resolved!");
	const json = await response.json();
	return typeof json === "object"
		? json
		: Promise.reject(json);
}

// export const onGet:RequestHandler<EndpointData> = async ({params, response}) => {
// 	const blockData = await loadBlock(params.index);
// 	if (!blockData) {
// 		response.status = 404;
// 		return blockData;
// 	}

// 	response.headers.set('Cache-Control', 'no-cache, no-store, no-fun');
// 	return blockData;
// }

// const loadBlock = (blockIndex: string) => {

// }

export const head: DocumentHead = {
	title: "A Block",
};
