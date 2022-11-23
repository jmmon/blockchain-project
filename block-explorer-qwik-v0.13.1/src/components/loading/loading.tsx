import { component$, useStylesScoped$ } from "@builder.io/qwik";

export const Loading = component$(({path}: {path: string;}) => {
	useStylesScoped$(`
	.loading {
		font-size: 3rem;
		color: #aaa;

	}
	`);

					// 	(
					// 	<div style="width: 100vw; height: 100vh; background-color: #ff8888; font-size: 80px;">
					// 		Loading...
					// 	</div>
					// )
	return <div class="loading"><em>Loading {path}...</em></div>
})