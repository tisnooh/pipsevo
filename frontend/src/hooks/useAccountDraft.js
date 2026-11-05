import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Refresh clean forms when the profile arrives, without discarding unsaved work.
// Drafts must never survive a change of authenticated account.
export default function useAccountDraft(ownerId, source, normalize) {
  const incoming = useMemo(() => normalize(source), [source, normalize]);
  const signature = JSON.stringify(incoming);
  const currentOwner = useRef({ id: ownerId, revision: 0 });
  if (currentOwner.current.id !== ownerId) currentOwner.current = { id: ownerId, revision: currentOwner.current.revision + 1 };
  const ownerRevision = currentOwner.current.revision;
  const baseline = useRef({ ownerId, signature });
  const [draft, setDraft] = useState(incoming);

  useEffect(() => {
    const previous = baseline.current;
    baseline.current = { ownerId, signature };
    setDraft(current => previous.ownerId !== ownerId || JSON.stringify(current) === previous.signature ? incoming : current);
  }, [ownerId, signature, incoming]);

  const commit = useCallback(value => {
    // A save from the previous session may resolve after an account switch.
    if (currentOwner.current.id !== ownerId || currentOwner.current.revision !== ownerRevision) return false;
    const saved = normalize(value);
    baseline.current = { ownerId, signature: JSON.stringify(saved) };
    setDraft(saved);
    return true;
  }, [ownerId, ownerRevision, normalize]);

  return [draft, setDraft, { commit, dirty: JSON.stringify(draft) !== signature }];
}
