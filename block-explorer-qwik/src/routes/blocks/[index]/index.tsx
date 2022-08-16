import { component$, Resource, useResource$ } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";
import Block from "../../../components/block/block";

export default component$(() => {
	const { params } = useLocation();

	const blockResource = useResource$(({ track, cleanup }) => {
		const controller = new AbortController();
		cleanup(() => controller.abort());

		return getBlock(params.index, controller);
	});

	return (
		<div>
			<h1>Get A Block:</h1>
			<Resource
				resource={blockResource}
				onPending={() => <>Loading...</>}
				onRejected={(error) => <>Error: {error.errorMsg}</>}
				onResolved={(block) => <Block block={block} />}
			/>
		</div>
	);
});

export async function getBlock(
	index: string,
	controller?: AbortController
): Promise<Object> {
	console.log("Fetching block...");
	const response = await fetch(`http://localhost:5555/blocks/${index}`, {
		signal: controller?.signal,
	});
	const responseJson = await response.json();
	console.log("json:", responseJson);
	if (responseJson.errorMsg) return Promise.reject(responseJson);
	return responseJson;
}

export const head: DocumentHead = {
	title: "A Block",
};
