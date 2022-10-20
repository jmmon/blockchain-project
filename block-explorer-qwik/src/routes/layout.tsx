import { component$, Slot, useContextProvider, useStore, useWatch$ } from '@builder.io/qwik';
import { SessionContext } from '~/libs/context';
import Footer from '../components/footer/footer';
import Header from '../components/header/header';

export default component$(() => {
	const session = useStore({
		port: 5555,
	});

	useContextProvider(SessionContext, session);

	useWatch$((track) => {
		track(session, 'port');
		console.log('Port changed');
	})

  return (
    <div>
      <Header />
      <main>
        <Slot />
      </main>
      <Footer />
    </div>
  );
});


export async function getTransactions(
	urlString: String,
	controller?: AbortController,
): Promise<Object> {
	console.log(`Fetching transactions from ${urlString}...`);
	const response = await fetch(urlString, {
		signal: controller?.signal,
	});

	const responseJson = await response.json();
	console.log("json:", responseJson);

	if (responseJson.errorMsg) return Promise.reject(responseJson);
	return responseJson;
}