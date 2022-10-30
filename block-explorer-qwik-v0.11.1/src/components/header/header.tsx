import {
	$,
	component$,
	Resource,
	useClientEffect$,
	useContext,
	useMount$,
	useRef,
	useResource$,
	useServerMount$,
	useStyles$,
	useWatch$,
} from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { json } from 'stream/consumers';
import constants from '~/libs/constants';
import { SessionContext, iPeers } from '~/libs/context';
import peers from '~/routes/[ip]/info/peers';
import SearchBar from '../searchBar/searchBar';
import styles from './header.css?inline';

export default component$(() => {
	const session = useContext(SessionContext);
	useStyles$(styles);

	const { pathname } = useLocation();

	return (
		<>
			<header>
				<div class="header-inner">
					<section class="logo">
						<Link href={`/`}>Qwik City 🏙</Link>

						{/* <label>
							<input
								type="checkbox"
								checked
								onChange$={(e) => (session.searchForPeers = e.target.checked)}
							/>
							Search for nodes?
						</label>
						<select
							// onChange$={(ev) => {
							// 	console.log('changing select');
							// 	// session.port = +ev.target.value;

							// }}
							value={session.port}
						>
							<option value={constants.defaultPort}>
								<Link href={`http://localhost:${constants.defaultPort}/peers`}>Default ({constants.defaultPort})</Link>
							</option>
							{session.peers.length >= 1 &&
								session.peers.map((peer) => {
									console.log('mapping peers:', {peer});
									const url = peer[1];
									const port = url.split(':')[2];
									console.log({ url, port });
									return (
										<option value={port}>
											<a href={url}>{port}</a>
										</option>
									);
								})}
						</select> */}

						<SearchBar />
					</section>
					<nav>
						<Link
							href={`/${session.port ?? constants.defaultPort}/info`}
							class={{ active: pathname.startsWith(`/${session.port}/info`) }}
						>
							Blockchain Info
						</Link>
						<Link
							href={`/${session.port ?? constants.defaultPort}/addresses`}
							class={{ active: pathname.startsWith(`/${session.port}/addresses`) }}
						>
							Addresses
						</Link>
						<Link
							href={`/${session.port ?? constants.defaultPort}/transactions`}
							class={{ active: pathname.startsWith(`/${session.port}/transactions`) }}
						>
							Transactions
						</Link>
						<a
							href={`/${session.port ?? constants.defaultPort}/blocks`}
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
