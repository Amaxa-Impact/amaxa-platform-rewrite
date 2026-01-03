import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// How long a user is considered "present" after their last update
const PRESENCE_TIMEOUT = 10000 // 10 seconds

/**
 * List all present users in a room with their presence data
 */
export const list = query({
  args: {
    room: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    
    // Get all presence entries for this room
    const entries = await ctx.db
      .query('presence')
      .withIndex('by_room', (q) => q.eq('room', args.room))
      .collect()
    
    // Return with present status based on last update
    return entries.map((entry) => ({
      created: entry.created,
      latestJoin: entry.latestJoin,
      user: entry.user,
      data: entry.data as Record<string, unknown>,
      present: now - entry.updated < PRESENCE_TIMEOUT,
    }))
  },
})

/**
 * Update presence data for a user in a room
 * Creates entry if it doesn't exist, updates if it does
 */
export const update = mutation({
  args: {
    room: v.string(),
    user: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    
    // Find existing presence entry
    const existing = await ctx.db
      .query('presence')
      .withIndex('by_room_and_user', (q) => 
        q.eq('room', args.room).eq('user', args.user)
      )
      .first()

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        data: args.data,
        updated: now,
      })
    } else {
      // Create new entry
      await ctx.db.insert('presence', {
        room: args.room,
        user: args.user,
        data: args.data,
        created: now,
        latestJoin: now,
        updated: now,
      })
    }
    
    return null
  },
})

/**
 * Heartbeat to keep presence alive without changing data
 */
export const heartbeat = mutation({
  args: {
    room: v.string(),
    user: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    
    const existing = await ctx.db
      .query('presence')
      .withIndex('by_room_and_user', (q) => 
        q.eq('room', args.room).eq('user', args.user)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        updated: now,
        latestJoin: now,
      })
    }
    
    return null
  },
})

/**
 * Cleanup old presence entries (can be called by a cron job)
 */
export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const staleThreshold = PRESENCE_TIMEOUT * 6 // 1 minute
    
    const entries = await ctx.db.query('presence').collect()
    
    let deletedCount = 0
    for (const entry of entries) {
      if (now - entry.updated > staleThreshold) {
        await ctx.db.delete(entry._id)
        deletedCount++
      }
    }
    
    return { deletedCount }
  },
})
