import { component$, useContext, useRef, useStore, useStyles$, useWatch$ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { SessionContext } from '~/libs/context';
import SearchBar from '../searchBar/searchBar';
import styles from './header.css?inline';

export default component$(() => {
	const session = useContext(SessionContext);
	useStyles$(styles);

	const {pathname} = useLocation();

	return (
		<header>
			<div class="header-inner">
				<section class="logo">
					<Link href="/">Qwik City 🏙</Link>

					<select
						onChange$={(ev) => {
							console.log('changing select');
							session.port = +ev.target.value;
						}}
						value={session.port}
					>
						<option value="5555">5555</option>
						<option value="5554">5554</option>
					</select>

					<SearchBar />
				</section>
				<nav>
					<Link
						href="/info"
						class={{ active: pathname.startsWith('/info') }}
					>
						Blockchain Info
					</Link>
					<Link
						href="/addresses"
						class={{ active: pathname.startsWith('/addresses') }}
					>
						Addresses
					</Link>
					<Link
						href="/transactions"
						class={{ active: pathname.startsWith('/transactions') }}
					>
						Transactions
					</Link>
					<a
						href="/blocks"
						class={{ active: pathname.startsWith('/blocks') }}
					>
						Blocks
					</a>
				</nav>
			</div>
		</header>
	);
});
