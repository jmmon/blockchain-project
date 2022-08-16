import { component$, Resource } from '@builder.io/qwik';
import { DocumentHead, RequestHandler, useEndpoint } from '@builder.io/qwik-city';

export default component$(() => {
	const resource = useEndpoint<typeof onGet>();
  return (
    <div>
      <h1>Confirmed Transactions</h1>
			<Resource 
				resource={resource}
				onPending={() => <p>Loading...</p>}
				onResolved={(transactions) => {
					if (transactions.length == 0) {
						return <p>No confirmed transactions found.</p>
					}

					return (
						<>
						{transactions.map(transaction => (
							<p>{transaction}</p>
						))}
						</>
					);
				}}
			/>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Confirmed Transactions',
};

// onGet more for params?
// use fetch in "server" code above the return in component function?
export const onGet: RequestHandler<EndpointData> = async ({response}) => {

}