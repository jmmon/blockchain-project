import { component$, Resource } from '@builder.io/qwik';
import { DocumentHead, useLocation, RequestHandler, useEndpoint } from '@builder.io/qwik-city';

export default component$(() => {
	const { params } = useLocation();
  const resource = useEndpoint<typeof onGet>();
  return (
    <div>
      <h1>Address: {params.address}</h1>
      <p> fetch this address's balance </p>
      <Resource 
        resource={resource}
        onPending={()=> <div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">Loading...</div>}
        onResolved={(balances) => {
          if (!balances) {
            return <p>No balance of this address.</p>
          }

          return (
            <>
              <h4>Pending balance:</h4>
              <div class="ml-4">{balances.pendingBalance}</div>
              <h4>Confirmed balance:</h4>
              <div class="ml-4">{balances.confirmedBalance}</div>
              <h4>Safe balance:</h4>
              <div class="ml-4">{balances.safeBalance}</div>
            </>
          );
        }}
      />
    </div>
  );
});

export const head: DocumentHead = {
  title: 'An Address',
};

export const onGet: RequestHandler<EndpointData> = async ({params, response}) => {
  const data = await getBalance(params.address);
  if (data.errorMsg) {
    response.status = 404;
    return data.errorMsg;
  }

  response.headers.set('Cache-Control', 'no-cache, no-store');
  return data;
}

export async function getBalance(
  address: string,
  controller?: AbortController
): Promise<object> {
  console.log('fetching balances of', address);
  const response = await fetch(`http://localhost:5555/address/${address}/balance`, {
    signal: controller?.signal,
  });
  const responseJson = await response.json();
  console.log('json:', responseJson);

  if (responseJson.errorMsg) {
    return Promise.reject(responseJson);
  }
  return responseJson;
}