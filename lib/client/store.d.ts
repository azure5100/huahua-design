declare let hostPreferences: {
    locale: "zh-CN" | "en";
    theme: "light" | "dark";
};
/** Current visibility of the frame-wide Design workspace. */
export declare function designWorkspaceOpen(): boolean;
/** Subscribe one React external-store listener. */
export declare function subscribeDesignWorkspace(listener: () => void): () => void;
/** Open or close the shared workspace surface. */
export declare function setDesignWorkspaceOpen(next: boolean): void;
/** Track the exact embedded Design window accepted by the session bridge. */
export declare function setDesignWorkspaceFrame(frame: Window | null): void;
/** Exact iframe source used to reject messages from unrelated loopback pages. */
export declare function designWorkspaceFrame(): Window | null;
/** Current DSH presentation preferences forwarded to the embedded canvas. */
export declare function designHostPreferences(): typeof hostPreferences;
/** Publish a native DSH locale/theme snapshot to React and the iframe bridge. */
export declare function setDesignHostPreferences(next: typeof hostPreferences): void;
export {};
