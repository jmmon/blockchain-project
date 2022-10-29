import {
	$,
	component$,
	useClientEffect$,
	useContext,
	useRef,
	useServerMount$,
	useStore,
	useStyles$,
	useWatch$,
} from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { json } from 'stream/consumers';
import { SessionContext } from '~/libs/context';
import peers from '~/routes/[ip]/info/peers';
import SearchBar from '../searchBar/searchBar';
import styles from './header.css?inline';

export default component$(() => {
	const session = useContext(SessionContext);
	useStyles$(styles);

	const store = useStore({
		peers: [],
		searchForPeers: true,
	});

	const { pathname } = useLocation();

	const fetchPeers = $(async () => {
		const url = `http://localhost:${session.port}/peers`;
		try {
			store.peers = await fetch(url).then((res) => json());
		} catch (err) {
			console.log('Error fetching peers:', err.message);
		}
	});

	useServerMount$(() => fetchPeers);

	useClientEffect$(({ track }) => {
		const search = track(store, 'searchForPeers');
		let timer;
		if (search) {
			fetchPeers();
			timer = setInterval(fetchPeers, 15000);
		} else {
			clearInterval(timer);
		}

		return () => clearInterval(timer);
	});

	return (<>
		<header>
			<div class="header-inner">
				<section class="logo">
					<Link href={`/${session.port}/`}>Qwik City 🏙</Link>

					<label>
						<input
							type="checkbox" checked
							onChange$={(e) => store.searchForPeers = e.target.checked}
						/>
						Search for nodes?
					</label>
					<select
						onChange$={(ev) => {
							console.log('changing select');
							session.port = +ev.target.value;
						}}
						value={session.port}
					>
						{/* {store.peers.length >= 1 && <option>Peers: {store.peers.length}</option>} */}
						{/* peers.map(([id, url]) => {
								const port = url.slice(url.indexOf(':') + 1);
								return (
									<option value="5555">
										<a href={url}>{port}</a>
									</option>
								);
							})} */}
						<option value="5555">
							<a href={`http://localhost:${session.port}`}>5555</a>
						</option>
						<option value="5554">5554</option>
					</select>

					<SearchBar />
				</section>
				<nav>
					<Link
						href={`/${session.port}/info`}
						class={{ active: pathname.startsWith(`/${session.port}/info`) }}
					>
						Blockchain Info
					</Link>
					<Link
						href={`/${session.port}/addresses`}
						class={{ active: pathname.startsWith(`/${session.port}/addresses`) }}
					>
						Addresses
					</Link>
					<Link
						href={`/${session.port}/transactions`}
						class={{ active: pathname.startsWith(`/${session.port}/transactions`) }}
					>
						Transactions
					</Link>
					<a
						href={`/${session.port}/blocks`}
						class={{ active: pathname.startsWith(`/${session.port}/blocks`) }}
					>
						Blocks
					</a>
				</nav>
			</div>
		</header>
		</>
	);
});
