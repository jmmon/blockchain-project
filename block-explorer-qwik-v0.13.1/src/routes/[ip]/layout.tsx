import { component$, Slot, useContext, useWatch$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { SessionContext } from "~/libs/context";

export default component$(() => {
	const session = useContext(SessionContext);
	const location = useLocation();


	useWatch$(({ track }) => {
		track(() => location);
		const port = location.pathname.split('/')[1];
		console.log('useWatch port tracking:', {port});
		if (typeof Number(port) === 'number') {
			session.port = port;
			console.log('Port changed to', port);
		}
	});

	return (
		<><Slot/></>
	)
})