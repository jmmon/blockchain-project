import { component$ } from "@builder.io/qwik";
import Transaction from "../transaction/transaction";

export default component$(({block}: {block: IBlock}) => {
	return (
		<ul>
			{"{"}
			{
			Object.keys(block).map((key) => {
				if (key === 'index') {
					return (
						<li class="ml-2">
							<a href={`#`}>
								{key}: {block[key]}
							</a>,
						</li>
					);
				}
				
				if (key === 'minedBy') {
					return (
						<li class="ml-2">
							<a href={`/addresses/${block[key]}`}>
								{key}: {block[key]}
							</a>,
						</li>
					);
				}

				if (key === "transactions") {
					const transactions = block[key];
					const totalTransactions = transactions.length;
					return (
						<li class="ml-2">Transactions: {"["}
							<ul class="ml-2">
								{transactions.map((transaction, index) => 
								(
									<Transaction transaction={transaction} index={index} totalTransactions={totalTransactions}/>
									)
								)}
							</ul>
						{"],"}
						</li>	
					)
				}

				return (
				<li class="ml-2">
					{key}: {block[key]},
				</li>
				);
			})}
			
		{"}"}</ul>
	);
});


// export const Block = component$(({block}: {block: IBlock}) => {
// 	// const location = useLocation();
// 	return (<><ul>
// 		{"{"}
// 		{Object.keys(block).map((key) => {
// 			if (key === 'index') {
// 				return (
// 					<li class="ml-2">
// 						<a href={`#`}>
// 							{key}: {block[key]}
// 						</a>,
// 					</li>
// 				);
// 			}
// 			if (key === 'minedBy') {
// 				return (
// 					<li class="ml-2">
// 						<a href={`/addresses/${block[key]}`}>
// 							{key}: {block[key]}
// 						</a>,
// 					</li>
// 				);
// 			}
// 			if (key === "transactions") {
// 				const transactions = block[key];
// 				const totalTransactions = transactions.length;
// 				return (
// 					<li class="ml-2">Transactions: [
// 						<ul class="ml-2">
// 							{transactions.map((transaction, index) => 
// 							(
// 								<Transaction transaction={transaction} index={index} totalTransactions={totalTransactions}/>
// 								)
// 							)}
// 						</ul>
// 					],</li>	
// 				)
// 			}

// 			return (
// 			<li class="ml-2">
// 				{key}: {block[key]},
// 			</li>
// 			);
// 		})}
		
// 		{"}"}
// 	</ul></>);
// });