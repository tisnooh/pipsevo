import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/apiError";

// A resource belongs to one session incarnation, not just to an account ID.
// This also rejects a late response after an A -> B -> A account switch.
export default function useOwnedResource(ownerId, fetchResource, emptyValue, fallbackMessage) {
  const scopeRef = useRef({ ownerId, active: true, request: 0 });
  if (scopeRef.current.ownerId !== ownerId) scopeRef.current = { ownerId, active: true, request: 0 };
  const scope = scopeRef.current;
  const [state, setState] = useState({ scope, data: emptyValue, loading: true, error: "" });
  const isCurrent = useCallback(ticket => Boolean(ticket?.active && ticket === scopeRef.current), []);
  const capture = useCallback(() => scope, [scope]);

  const reload = useCallback(async () => {
    if (!isCurrent(scope)) return;
    if (!ownerId) {
      setState({ scope, data: emptyValue, loading: false, error: "Session indisponible. Reconnecte-toi." });
      return;
    }
    const request = ++scope.request;
    setState(current => ({ scope, data: current.scope === scope ? current.data : emptyValue, loading: true, error: "" }));
    try {
      const data = await fetchResource();
      if (isCurrent(scope) && scope.request === request) setState({ scope, data, loading: false, error: "" });
    } catch (error) {
      if (isCurrent(scope) && scope.request === request) {
        setState({ scope, data: emptyValue, loading: false, error: apiErrorMessage(error, fallbackMessage) });
      }
    }
  }, [emptyValue, fallbackMessage, fetchResource, isCurrent, ownerId, scope]);

  useEffect(() => {
    scope.active = true;
    reload();
    return () => { scope.active = false; scope.request += 1; };
  }, [reload, scope]);

  // Hide the preceding owner's data during render, before effects run.
  const visible = state.scope === scope ? state : { data: emptyValue, loading: true, error: "" };
  return { ...visible, reload, capture, isCurrent };
}
