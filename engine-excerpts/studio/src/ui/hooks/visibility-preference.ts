import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";



export const PREVIEW_INFO_STORAGE_KEY = "example.ui.preview-info.v1";


export const PREVIEW_INFO_DEFAULT_VISIBLE = false;

export function readPreviewInfoPreference(): boolean {
  try {
    const stored =
      globalThis.window?.localStorage?.getItem(PREVIEW_INFO_STORAGE_KEY) ??
      null;
    return stored === "true";
  } catch {
    return PREVIEW_INFO_DEFAULT_VISIBLE;
  }
}

export function writePreviewInfoPreference(visible: boolean): boolean {
  try {
    globalThis.window?.localStorage?.setItem(
      PREVIEW_INFO_STORAGE_KEY,
      visible ? "true" : "false"
    );
    return true;
  } catch {
    // Storage can be unavailable (blocked or quota-limited); the in-memory
    // state still holds for as long as the preview stays open.
    return false;
  }
}

export type PreviewInfoPreference = {
  infoVisible: boolean;
  togglePreviewInfo: () => void;
};

export const PreviewInfoPreferenceContext =
  createContext<PreviewInfoPreference | null>(null);


export function usePreviewInfoPreference(): PreviewInfoPreference {
  const [infoVisible, setInfoVisible] = useState(PREVIEW_INFO_DEFAULT_VISIBLE);

  useEffect(() => {
    setInfoVisible(readPreviewInfoPreference());
  }, []);

  const togglePreviewInfo = useCallback(() => {
    setInfoVisible((previous) => {
      const next = !previous;
      writePreviewInfoPreference(next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({ infoVisible, togglePreviewInfo }),
    [infoVisible, togglePreviewInfo]
  );
}


export function usePreviewInfoVisibility(): boolean {
  return useContext(PreviewInfoPreferenceContext)?.infoVisible ?? true;
}
