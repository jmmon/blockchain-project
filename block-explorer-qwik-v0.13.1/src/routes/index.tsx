import { RequestHandler } from "@builder.io/qwik-city";
import constants from "~/libs/constants";

export const onGet: RequestHandler = async ({ request, response, params }) => {
	console.log('running redirect');
  throw response.redirect(`/${constants.defaultPort}`);
};