import { component$, Resource } from '@builder.io/qwik';
import { DocumentHead, RequestHandler, useEndpoint } from '@builder.io/qwik-city';

export default component$(() => {
  const resource = useEndpoint<typeof onGet>();
  return (
    <div>
      <h1>Blockchain Info</h1>
      <p><a href="/info/peers">Peers</a> and difficulty, etc</p>
      <Resource 
        resource={resource}
        onPending={() => <div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">Loading...</div>}
        onResolved={(info) => {
          if (!info) {
            return <p>No transaction found.</p>
          }

          return (
            <>
              <h4>Blockchain Difficulty:</h4>
              <p class="ml-4">{info["currentDifficulty"]}</p>
              <div class="mt-4">
                <h5>All Blockchain Info:</h5>
                <ul class="ml-2">{"{"}
                  {Object.keys(info).map(key => 
                    <li class="ml-4">{key}: {info[key]}</li>
                  )}
                {"}"}</ul>
              </div>
            </>
          );
        }}
      />
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Blockchain Info',
};

export const onGet: RequestHandler<EndpointData> = async ({response}) => {
  const data = await getInfo();
  if (data.errorMsg) {
    response.status = 404;
    return data.errorMsg;
  }

  response.headers.set('Cache-Control', 'no-cache, no-store');
  return data;
}

export async function getInfo(
  controller?: AbortController
): Promise<Object> {
  console.log('Fetching info...');
  const response = await fetch('http://localhost:5555/info', {signal: controller?.signal});
  const responseJson = await response.json();
  console.log('json:', responseJson);

  if (responseJson.errorMsg) {
    return Promise.reject(responseJson);
  }
  return responseJson;
}