import { component$ } from "@builder.io/qwik";
import Transaction from "../transaction/transaction";

export default function component$({block}: Props) {
	return (<ul>
		{"{"}
		{Object.keys(block).map((key) => {
			if (key === 'minedBy') {
				return (
					<li class="ml-2">
						{key}: <a href={`/addresses/${block[key]}`}>{block[key]}</a>,
					</li>
				);
			}
			if (key === "transactions") {
				const transactions = block[key];
				const totalTransactions = transactions.length;
				return (
					<li class="ml-2">Transactions: [
						<ul class="ml-2">
							{transactions.map((transaction, index) => 
							(
								<Transaction transaction={transaction} index={index} totalTransactions={totalTransactions}/>
								)
							)}
						</ul>
					],</li>	
				)
			}

			return (
			<li class="ml-2">
				{key}: {block[key]},
			</li>
		)})}
		
		{"}"}
	</ul>)
}


interface Props {
	block: IBlock;
}