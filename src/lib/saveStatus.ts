"use client";

import { create } from "zustand";
import type { SaveStatus } from "./deviceStorage";

// Kept outside the persisted store to avoid recursive writes.
export const useSaveStatus = create<{ status: SaveStatus }>(() => ({ status: "ready" }));
export const reportSaveStatus = (status: SaveStatus) => useSaveStatus.setState({ status });
