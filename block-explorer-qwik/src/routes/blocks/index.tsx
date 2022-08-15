import { component$, Resource, useResource$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
	const blocksResource = useResource$(({ track, cleanup }) => {
		// const controller = new AbortController();
		// cleanup(() => controller.abort());

		return getBlocks();
	});

	console.log('render');
	return (
		<div>
			<h1>Get Blocks</h1>
			<Resource
				resource={blocksResource}
				onPending={() => <>Loading...</>}
				onRejected={(error) => <>Error: {error.message}</>}
				onResolved={(blocks) => (
					<ul>
						{blocks.map((block) => (
							<li>
								<a href={`/blocks/${block.index}`}>
									Block #{block.index}
								</a>
							</li>
						))}
					</ul>
				)}
			/>
		</div>
	);
});

export async function getBlocks(
	controller?: AbortController
): Promise<string[]> {
	console.log("Fetching blocks...");
	const response = await fetch("http://localhost:5555/blocks", {
		signal: controller?.signal,
	});
	console.log("fetch resolved!");
	const json = await response.json();
	return Array.isArray(json)
		? json.map((block) => JSON.stringify(block))
		: Promise.reject(json);
}

export const head: DocumentHead = {
	title: "Blocks",
};
