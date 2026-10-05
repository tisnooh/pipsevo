import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export default function ConfirmDialog({ request, onResolve }) {
  return <AlertDialog open={Boolean(request)} onOpenChange={(open) => { if (!open) onResolve(false); }}>
    <AlertDialogContent className="mx-0 w-[calc(100%-2rem)] max-w-md max-h-[85dvh] overflow-y-auto border-[var(--pe-border)] bg-[var(--pe-surface)] text-[var(--pe-text)]">
      <AlertDialogHeader>
        <AlertDialogTitle>{request?.title || "Confirmer l’action"}</AlertDialogTitle>
        <AlertDialogDescription className="text-[var(--pe-text-muted)]">{request?.description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-5">
        <AlertDialogCancel type="button" className="border-[var(--pe-border)] bg-transparent text-[var(--pe-text)] hover:bg-[var(--pe-surface-soft)]">{request?.cancelLabel || "Annuler"}</AlertDialogCancel>
        <AlertDialogAction type="button" onClick={() => onResolve(true)} className={request?.destructive ? "bg-[#D63D4C] text-white hover:bg-[#ED4B5B]" : "bg-[#7657FF] text-white hover:bg-[#866BFF]"}>{request?.confirmLabel || "Confirmer"}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export function useConfirmDialog() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const resolve = useCallback((accepted) => {
    resolver.current?.(accepted);
    resolver.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback((options) => {
    resolver.current?.(false);
    return new Promise((nextResolver) => {
      resolver.current = nextResolver;
      setRequest(options);
    });
  }, []);

  useEffect(() => () => {
    resolver.current?.(false);
    resolver.current = null;
  }, []);

  return {
    confirm,
    confirmationOpen: Boolean(request),
    confirmationDialog: <ConfirmDialog request={request} onResolve={resolve} />,
  };
}
