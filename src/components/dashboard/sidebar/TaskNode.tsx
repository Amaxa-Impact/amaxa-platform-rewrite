import { memo, useState, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconPencil, IconCheck, IconX } from '@tabler/icons-react'
import type { Id } from '@convex/_generated/dataModel'

export type TaskNodeData = {
  label: string
  description?: string
  status?: 'todo' | 'in_progress' | 'completed' | 'blocked'
  assignedTo?: string
  dueDate?: number
  priority?: 'low' | 'medium' | 'high'
  onStatusChange?: (status: TaskNodeData['status']) => void
  onDataChange?: (data: Partial<TaskNodeData>) => void
  projectMembers?: Array<{ userId: string; name?: string }>
}

const statusColors = {
  todo: 'bg-card border-border',
  in_progress:
    'bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-600',
  completed:
    'bg-green-50 dark:bg-green-950 border-green-400 dark:border-green-600',
  blocked: 'bg-red-50 dark:bg-red-950 border-red-400 dark:border-red-600',
}

const priorityColors = {
  low: 'text-muted-foreground',
  medium: 'text-yellow-600 dark:text-yellow-500',
  high: 'text-red-600 dark:text-red-500',
}

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
] as const

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

export const TaskNode = memo(({ data, id }: NodeProps) => {
  const taskData = data as TaskNodeData
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    label: taskData.label,
    description: taskData.description || '',
    assignedTo: taskData.assignedTo || '',
    priority: taskData.priority || 'medium',
  })

  const status = taskData.status || 'todo'
  const priority = taskData.priority || 'medium'

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (taskData.onStatusChange) {
        taskData.onStatusChange(newStatus as TaskNodeData['status'])
      }
    },
    [taskData],
  )

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsEditing(true)
      setEditForm({
        label: taskData.label,
        description: taskData.description || '',
        assignedTo: taskData.assignedTo || '',
        priority: taskData.priority || 'medium',
      })
    },
    [taskData],
  )

  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (taskData.onDataChange) {
        taskData.onDataChange({
          label: editForm.label,
          description: editForm.description || undefined,
          assignedTo: editForm.assignedTo || undefined,
          priority: editForm.priority,
        })
      }
      setIsEditing(false)
    },
    [taskData, editForm],
  )

  const handleCancel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsEditing(false)
      setEditForm({
        label: taskData.label,
        description: taskData.description || '',
        assignedTo: taskData.assignedTo || '',
        priority: taskData.priority || 'medium',
      })
    },
    [taskData],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }, [])

  if (isEditing) {
    return (
      <div
        className={`px-3 py-3 shadow-md rounded-lg border-2 min-w-[280px] bg-card text-card-foreground`}
        onKeyDown={handleKeyDown}
      >
        <Handle type="target" position={Position.Left} className="w-3 h-3" />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Edit Task
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleSave}
              >
                <IconCheck className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleCancel}
              >
                <IconX className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Task name"
              value={editForm.label}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, label: e.target.value }))
              }
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />

            <Textarea
              placeholder="Description (optional)"
              value={editForm.description}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              onClick={(e) => e.stopPropagation()}
              className="min-h-[60px]"
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Priority
                </label>
                <Select
                  value={editForm.priority}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({
                      ...prev,
                      priority: value as TaskNodeData['priority'],
                    }))
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Assigned To
                </label>
                <Input
                  placeholder="User ID"
                  value={editForm.assignedTo}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      assignedTo: e.target.value,
                    }))
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        </div>

        <Handle type="source" position={Position.Right} className="w-3 h-3" />
      </div>
    )
  }

  return (
    <div
      className={`px-3 py-2.5 shadow-md rounded-lg border-2 min-w-[200px] text-foreground ${statusColors[status]}`}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight flex-1">
            {taskData.label}
          </h3>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${priorityColors[priority]}`}>
              {priority.toUpperCase()}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              onClick={handleEditClick}
            >
              <IconPencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {taskData.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {taskData.description}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger
              size="sm"
              className="h-6 text-xs w-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {taskData.assignedTo && (
          <div className="text-xs text-muted-foreground">
            Assigned to: {taskData.assignedTo}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  )
})

TaskNode.displayName = 'TaskNode'
