import { $, component$, useContext, useStore } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { SessionContext } from '~/libs/context';

interface IStore {
	query: string;
}

export default component$((props) => {
	const session = useContext(SessionContext);
	const store = useStore<IStore>({
		query: '',
	});

	const onChange = $((e) => {
		console.log({ value: e.target.value });

		const parsedString = e.target.value.replaceAll(' ', '+');
		console.log(parsedString);
		store.query = parsedString;
		// return false;
		// what to do? Could somehow delay a bit before searching.
		// Basically, need to figure out "what" the search term is
		// then when submitting, can show the results page
	});
	return (
		<div>
			{/* <label>
				Search Blockchain
				<input
					type="text"
					onKeyUp$={onChange}
					class="searchInput"
					placeholder="What are you looking for?"
				/>
			</label>
			<Link href={`http://127.0.0.1:5173/search/${store.query}`}>Search</Link> */}

			<form action={ `/${session.port}/search` } method="GET" >
				<input type="text" name="text" placeholder="What are you looking for?" />
				<input type="submit" value="Search"/>
			</form>
		</div>
	);
});
