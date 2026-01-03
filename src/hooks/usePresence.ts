import { api } from '@convex/_generated/api'
import { useQuery, useMutation } from 'convex/react'
import { useCallback, useEffect, useRef } from 'react'

export type PresenceData<D> = {
  created: number
  latestJoin: number
  user: string
  data: D
  present: boolean
}

const HEARTBEAT_PERIOD = 3000 // 3 seconds for faster presence detection
const CURSOR_UPDATE_THROTTLE = 50 // 50ms = 20 updates per second max

/**
 * usePresence is a React hook for reading & writing presence data.
 *
 * Uses Convex's real-time subscriptions for live updates.
 * Throttles cursor updates to prevent overwhelming the server.
 */
export const usePresence = <T extends Record<string, unknown>>(
  room: string,
  user: string,
  initialData: T,
) => {
  // Track current data locally
  const dataRef = useRef<T>(initialData)
  const lastUpdateRef = useRef<number>(0)
  const pendingUpdateRef = useRef<T | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Real-time presence query - this provides live updates from Convex
  const presence = useQuery(api.presence.list, { room })
  
  // Filter out current user and only show present users
  const othersPresence = presence
    ?.filter((p) => p.user !== user && p.present)
    .map((p) => ({
      ...p,
      data: p.data as T,
    })) as PresenceData<T>[] | undefined

  // Mutations
  const updatePresenceMutation = useMutation(api.presence.update)
  const heartbeatMutation = useMutation(api.presence.heartbeat)

  // Initial presence update on mount
  useEffect(() => {
    void updatePresenceMutation({ room, user, data: initialData })
    
    // Cleanup on unmount - could add a "leave" mutation here
    return () => {
      // Optional: mark user as leaving
    }
  }, [room, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Heartbeat to keep presence alive
  useEffect(() => {
    const intervalId = setInterval(() => {
      void heartbeatMutation({ room, user })
    }, HEARTBEAT_PERIOD)

    return () => clearInterval(intervalId)
  }, [heartbeatMutation, room, user])

  // Throttled update function for cursor movements
  const updateData = useCallback(
    (patch: Partial<T>) => {
      // Merge with current data
      const newData = { ...dataRef.current, ...patch }
      dataRef.current = newData

      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateRef.current

      if (timeSinceLastUpdate >= CURSOR_UPDATE_THROTTLE) {
        // Enough time has passed, update immediately
        lastUpdateRef.current = now
        void updatePresenceMutation({ room, user, data: newData })
      } else {
        // Throttle: schedule update for later
        pendingUpdateRef.current = newData
        
        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => {
            if (pendingUpdateRef.current) {
              lastUpdateRef.current = Date.now()
              void updatePresenceMutation({ 
                room, 
                user, 
                data: pendingUpdateRef.current 
              })
              pendingUpdateRef.current = null
            }
            timeoutRef.current = null
          }, CURSOR_UPDATE_THROTTLE - timeSinceLastUpdate)
        }
      }
    },
    [room, user, updatePresenceMutation],
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [dataRef.current, othersPresence, updateData] as const
}

export default usePresence
