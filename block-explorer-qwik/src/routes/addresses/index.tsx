import { component$, Resource } from '@builder.io/qwik';
import { DocumentHead, RequestHandler, useEndpoint } from '@builder.io/qwik-city';

export default component$(() => {
  // use our onGet request handler
  const resource = useEndpoint<typeof onGet>();
  return (
    <div>
      <h1>Addresses</h1>
      <p>fetch all (confirmed, non-zero) address balances</p>
      <Resource 
        resource={resource}
        onPending={()=><p>Loading...</p>}
        onResolved={(balances) => {
          if (!balances) {
            return <p>Should never show</p>
          }

          return (
            <>
              <h4>Balances:</h4>
              <ul>
                {Object.keys(balances).map(address => (<li class="ml-4">{address}: {balances[address]}</li>))}
              </ul>
            </>
          );
        }}
      />
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Addresses',
};


export const onGet: RequestHandler<EndpointData> = async ({response}) => {
  const data = await getAllBalances();
  if (data.errorMsg) {
    response.status = 404;
    return data.errorMsg;
  }

  response.headers.set('Cache-Control', 'no-cache, no-store, no-fun');
  return data;
}

export async function getAllBalances(
  controller?: AbortController
) : Promise<Object> {
  console.log('fetching ALL balances...');
  const response = await fetch('http://localhost:5555/balances', {
    signal: controller?.signal,
  });
  const responseJson = await response.json();
  console.log('json:', responseJson);

  if (responseJson.errorMsg) {
    return Promise.reject(responseJson);
  }
  return responseJson;
}