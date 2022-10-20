import { component$, Resource, useResource$, useStore } from '@builder.io/qwik';
import { DocumentHead, useLocation, RequestHandler, useEndpoint } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';

export default component$(() => {
	const { params } = useLocation();
	const session = useStore(SessionContext);

	const resource = useResource$(({ track, cleanup }) => {
		track(session, "port");

		const controller = new AbortController();
		cleanup(() => controller.abort());
		
		const urlString = `${constants.baseUrl}${session.port}/address/${params.address}/balance`;
		return getBalance(urlString, controller, );
	});

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
      <a href={`/addresses/${params.address}/transactions`}>View Transactions...</a>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'An Address',
};

export async function getBalance(
  urlString: String,
  controller?: AbortController
): Promise<object> {
  console.log('fetching balances of', address);
  const response = await fetch(urlString, {
    signal: controller?.signal,
  });
  const responseJson = await response.json();
  console.log('json:', responseJson);

  if (responseJson.errorMsg) {
    return Promise.reject(responseJson);
  }
  return responseJson;
}