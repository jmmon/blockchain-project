import { component$, Resource, useResource$, useStore } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";
import constants from "~/libs/constants";
import { SessionContext } from "~/libs/context";
import Block from "../../../components/block/block";

export default component$(() => {
	const { params } = useLocation();
	const session = useStore(SessionContext);

	const blockResource = useResource$(({ track, cleanup }) => {
		track(session, "port");

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.baseUrl}${session.port}/blocks/${params.index}`;
		return getBlock(urlString, controller);
	});

	return (
		<div>
			<h1>Get A Block:</h1>
			<Resource
				resource={blockResource}
				onPending={() => <div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">Loading...</div>}
				onRejected={(error) => <>Error: {error.errorMsg}</>}
				onResolved={(block) => <Block block={block} />}
			/>
		</div>
	);
});

export async function getBlock(
	urlString: String,
	controller?: AbortController
): Promise<Object> {
	console.log("Fetching block...");
	const response = await fetch(urlString, {
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
