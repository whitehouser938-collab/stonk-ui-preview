import { atom } from "jotai";

// Define a global atom for the "LIVE" state
export const isLiveAtom = atom(true);

export const searchTermAtom = atom("");

// Global atom for search modal open state
export const isSearchModalOpenAtom = atom(false);
