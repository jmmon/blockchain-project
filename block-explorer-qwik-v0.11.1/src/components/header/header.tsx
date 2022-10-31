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

{/* 						<SearchBar /> */}
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
