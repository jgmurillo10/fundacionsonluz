'use client';
import { createContext, useContext } from 'react';
export const RemoteEditorContext = createContext(false);
export function useRemoteEditor() {
  return useContext(RemoteEditorContext);
}
