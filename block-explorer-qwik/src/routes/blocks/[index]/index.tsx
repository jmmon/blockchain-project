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
				onRejected={(error) => <>Error: {error.message}</>}
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
															{Object.keys(transaction).map((txKey) =>(<li class="ml-2">{txKey}: {transaction[txKey]}</li>))}
														{(transactions.length - 1 > index) ? "}," : "}"}</ul>
														)
													)}
												</ul>
											]</li>	
										)
									}
								return (
								<li class="ml-2">
									{key}: {block[key]}
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
): Promise<Block> {
	console.log("Fetching block...");
	const response = await fetch(`http://localhost:5555/blocks/${index}`, {
		signal: controller?.signal,
	});
	const fetchedBlockJson: Block = await response.json();
	console.log("json:", fetchedBlockJson);
	return typeof fetchedBlockJson === "object" ? fetchedBlockJson : Promise.reject(fetchedBlockJson);
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
