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

	

	console.log("render");
	return (
		<div>
			<h1>Get A Block:</h1>
			<Resource
				resource={blockResource}
				onPending={() => <>Loading...</>}
				onRejected={(error) => <>Error: {error.errorMsg}</>}
				onResolved={(block) => {				
					return (
						<ul>
							{"{"}
							{Object.keys(block).map((key) => {
								if (key === "transactions") {
									const transactions = block[key];
									return (
										<li class="ml-2">Transactions: [
											<ul class="ml-2">
												{transactions.map((transaction, index) => 
												(
													<ul class="ml-2">{`${index}: {`}
														{Object.keys(transaction).map((txKey) => {
															if (txKey === 'senderSignature') {
																return (<li class="ml-2">{`${txKey}: [`}
																	<ul class="ml-2">
																		<li class="ml-2">a: {transaction[txKey][0]},</li>
																		<li class="ml-2">b: {transaction[txKey][1]},</li>
																	</ul>
																{"],"}</li>
																)
															}
															return (<li class="ml-2">{txKey}: {transaction[txKey]},</li>)
														})}
													{(transactions.length - 1 > index) ? "}," : "}"}</ul>
													)
												)}
											</ul>
										]</li>	
									)
								}

								return (
								<li class="ml-2">
									{key}: {block[key]},
								</li>
							)})}
							
							{"}"}
						</ul>
					)
				}}
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

let Signature: string;

type Transaction = {
	from: string;
	to: string;
	value: number;
	fee: number;
	dateCreated: string;
	data: string;
	senderPubKefy: string;
	transactionDataHash: string;
	senderSignature: Array<Signature>;
	minedInBlockIndex: number;
	transferSuccessful: boolean;
};

type Block = {
	index: number;
	transactions: Array<Transaction>;
	difficulty: number;
	prevBlockHash: string;
	minedBy: string;
	blockDataHash: string;
	nonce: number;
	dateCreated: string;
	blockHash: string;
};

export const head: DocumentHead = {
	title: "A Block",
};
