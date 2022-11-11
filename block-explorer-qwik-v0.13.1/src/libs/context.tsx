import { createContext } from "@builder.io/qwik";

export interface iSessionContext {
	port: number;
	peers: Array<iPeer>;
	searchForPeers: boolean;
}

export interface iPeer {
	id: string;
	url: string;
}

export const SessionContext = createContext<iSessionContext>("port-context");