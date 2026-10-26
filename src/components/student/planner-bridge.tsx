"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useLayoutEditor } from "@/components/layout-editor/editor-context";

/** A request from elsewhere on the dashboard to plan a grade for one class. */
export type PlannerRequest = { classId: string; nonce: number };

type PlannerBridge = {
  request: PlannerRequest | null;
  planFor: (classId: string) => void;
  /**
   * Whether the goal planner is on the page to receive a request. False while
   * the student has hidden its section, so nothing offers "Plan my grade".
   */
  available: boolean;
};

const PlannerBridgeContext = createContext<PlannerBridge | null>(null);

/**
 * Lets the assignment inbox's "Plan my grade" button hand a class to the goal
 * planner (which prefills it and scrolls into view) without the two
 * components knowing about each other.
 *
 * `section` names the planner's section in an arrangeable page: the bridge is
 * available only while that section is shown. It follows the live
 * arrangement (the draft while arranging, the saved one after Done), so the
 * button comes and goes without a reload and is right on the server too.
 */
export function PlannerBridgeProvider({ section, children }: { section?: string; children: React.ReactNode }) {
  const editor = useLayoutEditor();
  const available = !section || !(editor?.layout?.hidden.includes(section) ?? false);
  const [request, setRequest] = useState<PlannerRequest | null>(null);
  const planFor = useCallback((classId: string) => {
    setRequest((previous) => ({ classId, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);
  const value = useMemo(() => ({ request, planFor, available }), [request, planFor, available]);
  return <PlannerBridgeContext.Provider value={value}>{children}</PlannerBridgeContext.Provider>;
}

/** Null outside a provider, so either component also works on its own. */
export function usePlannerBridge(): PlannerBridge | null {
  return useContext(PlannerBridgeContext);
}
