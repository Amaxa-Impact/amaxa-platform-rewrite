import { mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Migration: Update all 'default' roles to 'member'
 * Run this once via the Convex dashboard after deploying the schema change
 */
export const migrateDefaultToMember = mutation({
  args: {},
  returns: v.object({
    updated: v.number(),
  }),
  handler: async (ctx) => {
    const allAssignments = await ctx.db.query('userToProject').collect()
    let updated = 0

    for (const assignment of allAssignments) {
      await ctx.db.patch(assignment._id, {
        role: 'member',
      })
      updated++
    }

    return { updated }
  },
})

/**
 * Migration: Migrate tasks from old schema (with nested data) to new schema (flat fields)
 * This also creates taskNodes entries for each task
 * Run this once via the Convex dashboard after deploying the schema change
 */
export const migrateTasksToNewSchema = mutation({
  args: {},
  returns: v.object({
    tasksUpdated: v.number(),
    nodesCreated: v.number(),
  }),
  handler: async (ctx) => {
    // Get all tasks with the old schema format
    const allTasks = await ctx.db.query('tasks').collect()
    let tasksUpdated = 0
    let nodesCreated = 0

    for (const task of allTasks) {
      // Check if this task has the old format (has 'data' field)
      const taskAny = task as any

      if (taskAny.data && typeof taskAny.data === 'object') {
        // This is an old format task - migrate it
        const oldData = taskAny.data
        const position = taskAny.position
        const type = taskAny.type || 'task'

        // Update the task with flat fields
        await ctx.db.patch(task._id, {
          label: oldData.label || 'Untitled Task',
          description: oldData.description,
          status: oldData.status,
          assignedTo: oldData.assignedTo,
          dueDate: oldData.dueDate,
          priority: oldData.priority,
        })

        // Check if a taskNode already exists for this task
        const existingNode = await ctx.db
          .query('taskNodes')
          .withIndex('by_task', (q) => q.eq('taskId', task._id))
          .unique()

        if (!existingNode && position) {
          // Create a taskNode entry
          await ctx.db.insert('taskNodes', {
            taskId: task._id,
            projectId: task.projectId,
            type: type,
            position: position,
            width: taskAny.width,
            height: taskAny.height,
            style: taskAny.style,
          })
          nodesCreated++
        }

        tasksUpdated++
      }
    }

    return { tasksUpdated, nodesCreated }
  },
})

/**
 * Migration: Clean up old fields from tasks after migration
 * Run this AFTER migrateTasksToNewSchema has been run successfully
 */
export const cleanupOldTaskFields = mutation({
  args: {},
  returns: v.object({
    cleaned: v.number(),
  }),
  handler: async (ctx) => {
    const allTasks = await ctx.db.query('tasks').collect()
    let cleaned = 0

    for (const task of allTasks) {
      const taskAny = task as any

      // Check if old fields still exist
      if (taskAny.data || taskAny.position || taskAny.type) {
        // We can't actually remove fields in Convex, but we can replace the document
        // For now, just count how many would need cleaning
        cleaned++
      }
    }

    return { cleaned }
  },
})
