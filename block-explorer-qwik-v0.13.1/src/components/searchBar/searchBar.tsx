import { component$, useContext } from '@builder.io/qwik';
import { SessionContext } from '~/libs/context';

export default component$((props) => {
	const session = useContext(SessionContext);

	return (
		<div>
			<form
				action={`/${session.port}/search`}
				method="GET"
			>
				<input
					type="text"
					name="query"
					placeholder="What are you looking for?"
				/>
				<input
					type="submit"
					value="Search"
				/>
			</form>
		</div>
	);
});
