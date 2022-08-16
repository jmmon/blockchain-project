import { component$ } from "@builder.io/qwik";
import Transaction from "../transaction/transaction";
import ITransaction from "../transaction/transactionType";

export default function component$({block}) {
	return (<ul>
		{"{"}
		{Object.keys(block).map((key) => {
			if (key === "transactions") {
				const transactions = block[key];
				const totalTransactions = transactions.length;
				return (
					<li class="ml-2">Transactions: [
						<ul class="ml-2">
							{transactions.map((transaction, index) => 
							(
								<Transaction transaction={transaction} index={index} totalTransactions={totalTransactions}/>
								// <ul class="ml-2">{`${index}: {`}
								// 	{Object.keys(transaction).map((txKey) => {
								// 		if (txKey === 'senderSignature') {
								// 			return (<li class="ml-2">{`${txKey}: [`}
								// 				<ul class="ml-2">
								// 					<li class="ml-2">a: {transaction[txKey][0]},</li>
								// 					<li class="ml-2">b: {transaction[txKey][1]},</li>
								// 				</ul>
								// 			{"],"}</li>
								// 			)
								// 		}
								// 		return (<li class="ml-2">{txKey}: {transaction[txKey]},</li>)
								// 	})}
								// {(transactions.length - 1 > index) ? "}," : "}"}</ul>
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
