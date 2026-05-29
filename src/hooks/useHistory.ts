import { useCallback, useMemo, useState } from 'react'

export function useHistory<T>(initial: T) {
  const [past, setPast] = useState<T[]>([])
  const [present, setPresent] = useState<T>(initial)
  const [future, setFuture] = useState<T[]>([])

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const set = useCallback((next: T | ((current: T) => T)) => {
    setPast((currentPast) => [...currentPast, present])
    setPresent((currentPresent) =>
      typeof next === 'function' ? (next as (current: T) => T)(currentPresent) : next
    )
    setFuture([])
  }, [present])

  const undo = useCallback(() => {
    if (!canUndo) return
    const previous = past[past.length - 1]
    setPast((items) => items.slice(0, -1))
    setFuture((items) => [present, ...items])
    setPresent(previous)
  }, [canUndo, past, present])

  const redo = useCallback(() => {
    if (!canRedo) return
    const [next, ...rest] = future
    setFuture(rest)
    setPast((items) => [...items, present])
    setPresent(next)
  }, [canRedo, future, present])

  return useMemo(
    () => ({ value: present, set, undo, redo, canUndo, canRedo }),
    [present, set, undo, redo, canUndo, canRedo]
  )
}
