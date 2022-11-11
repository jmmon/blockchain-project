// import { useContext } from "@builder.io/qwik";
import constants from "~/libs/constants";
// import { SessionContext } from "~/libs/context";

export const onGet: RequestHandler<DashboardData> = async ({ request, response, params }) => {
	// const session = useContext(SessionContext);

	// session.port =
	// console.log({request, response, params});
	console.log('running redirect');
  throw response.redirect(`/${constants.defaultPort}`);
};