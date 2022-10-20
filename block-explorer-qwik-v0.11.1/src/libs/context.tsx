import { createContext } from "@builder.io/qwik";

export interface ISessionContext {
	port: number;
}

export const SessionContext = createContext<ISessionContext>("port-context");