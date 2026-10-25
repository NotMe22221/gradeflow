"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** A request from elsewhere on the dashboard to plan a grade for one class. */
export type PlannerRequest = { classId: string; nonce: number };

type PlannerBridge = {
  request: PlannerRequest | null;
  planFor: (classId: string) => void;
};

const PlannerBridgeContext = createContext<PlannerBridge | null>(null);

/**
 * Lets the assignment inbox's "Plan my grade" button hand a class to the goal
 * planner (which prefills it and scrolls into view) without the two
 * components knowing about each other.
 */
export function PlannerBridgeProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<PlannerRequest | null>(null);
  const planFor = useCallback((classId: string) => {
    setRequest((previous) => ({ classId, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);
  const value = useMemo(() => ({ request, planFor }), [request, planFor]);
  return <PlannerBridgeContext.Provider value={value}>{children}</PlannerBridgeContext.Provider>;
}

/** Null outside a provider, so either component also works on its own. */
export function usePlannerBridge(): PlannerBridge | null {
  return useContext(PlannerBridgeContext);
}
