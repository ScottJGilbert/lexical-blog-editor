import { createContext, useContext } from "react";
import type { UploadManager } from "./UploadManager";

export const UploadManagerContext = createContext<UploadManager | null>(null);

/** The upload manager of the enclosing `<Editor>` (null outside one). */
export function useUploadManager(): UploadManager | null {
  return useContext(UploadManagerContext);
}
