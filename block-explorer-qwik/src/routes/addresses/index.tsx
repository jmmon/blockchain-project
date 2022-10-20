import { component$, Resource, useResource$, useStore } from '@builder.io/qwik';
import { DocumentHead, RequestHandler, useEndpoint } from '@builder.io/qwik-city';
import constants from '~/libs/constants';
import { SessionContext } from '~/libs/context';

export default component$(() => {
	const session = useStore(SessionContext);

	const resource = useResource$(({ track, cleanup }) => {
		track(session, "port");

		const controller = new AbortController();
		cleanup(() => controller.abort());

		const urlString = `${constants.baseUrl}${session.port}/balances`;
		return getAllBalances(urlString, controller, );
	});
	
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

export async function getAllBalances(
	 urlString: String,
  controller?: AbortController
) : Promise<Object> {
  console.log('fetching ALL balances...');
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