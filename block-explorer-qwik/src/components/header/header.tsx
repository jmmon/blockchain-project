import { component$, useRef, useStore, useStyles$, useWatch$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { SessionContext } from '~/libs/context';
import styles from './header.css?inline';

export default component$(() => {
	const session = useStore(SessionContext);
  useStyles$(styles);

  const pathname = useLocation().pathname;

  return (
    <header>
      <div class="header-inner">
        <section class="logo">
          <a href="/">Qwik City 🏙</a>
        </section>
        <nav>
		  <select 
		  onChange$={(ev) => {
			session.port = +ev.target.value
		}}
		  >
			<option value="5555">5555</option>
			<option value="5554">5554</option>
		  </select>
          <a href="/info" class={{ active: pathname.startsWith('/info') }}>
            Blockchain Info
          </a>
          <a href="/addresses" class={{ active: pathname.startsWith('/addresses') }}>
            Addresses
          </a>
          <a href="/transactions" class={{ active: pathname.startsWith('/transactions') }}>
            Transactions
          </a>
          <a href="/blocks" class={{ active: pathname.startsWith('/blocks') }}>
            Blocks
          </a>
          |
          <a href="/blog" class={{ active: pathname.startsWith('/blog') }}>
            Blog
          </a>
          <a href="/docs" class={{ active: pathname.startsWith('/docs') }}>
            Docs
          </a>
          <a href="/api" class={{ active: pathname.startsWith('/api') }}>
            API
          </a>
          <a href="/products/hat" class={{ active: pathname.startsWith('/products') }}>
            Products
          </a>
          <a href="/about-us" class={{ active: pathname.startsWith('/about-us') }}>
            About Us
          </a>
        </nav>
      </div>
    </header>
  );
});
