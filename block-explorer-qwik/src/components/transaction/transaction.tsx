import { component$ } from "@builder.io/qwik";

export default function component$({
	transaction,
	index,
	totalTransactions,
}: Props) {
	let last = true;
	if (totalTransactions) {
		last = !(index < totalTransactions - 1);
	}

	return (
		<ul class="ml-2">
			{`${typeof index === "number" ? `${index}: ` : ""}{`}
			{Object.keys(transaction).map((txKey) => {
				if (txKey === "transferSuccessful") {
					return (
						<li class="ml-4">
							{txKey}: {transaction[txKey] ? "true" : "false"},
						</li>
					);
				}
				if (txKey === "senderSignature") {
					return (
						<li class="ml-4">
							{`${txKey}: [`}
							<ul class="ml-4">
								<li class="ml-4">
									a: {transaction[txKey][0]},
								</li>
								<li class="ml-4">
									b: {transaction[txKey][1]},
								</li>
							</ul>
							{"],"}
						</li>
					);
				}
				return (
					<li class="ml-4">
						{txKey}: {transaction[txKey]},
					</li>
				);
			})}
			{`}${last ? "" : ","}`}
		</ul>
	);
}

interface Props {
	transaction: ITransaction;
	index?: number;
	totalTransactions?: number;
}
