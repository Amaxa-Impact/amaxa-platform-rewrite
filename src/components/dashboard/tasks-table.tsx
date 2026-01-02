import { useState, useEffect, useMemo } from 'react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { User } from '@workos-inc/node'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface TasksTableProps {
  projectId: Id<'projects'>
  allUsers: User[]
}

type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'blocked'

interface Filters {
  status: TaskStatus | undefined
  assignedTo: string | undefined
  searchLabel: string
}

const PAGE_SIZE = 10

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
}

const statusVariants: Record<
  TaskStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  todo: 'outline',
  in_progress: 'secondary',
  completed: 'default',
  blocked: 'destructive',
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-[200px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[80px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[120px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-[80px]" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function TasksTable({ projectId, allUsers }: TasksTableProps) {
  const [filters, setFilters] = useState<Filters>({
    status: undefined,
    assignedTo: undefined,
    searchLabel: '',
  })

  const debouncedSearch = useDebounce(filters.searchLabel, 300)

  const { results, status, loadMore } = usePaginatedQuery(
    api.dashboard.listTasksPaginated,
    {
      projectId,
      status: filters.status,
      assignedTo: filters.assignedTo,
      searchLabel: debouncedSearch || undefined,
    },
    { initialNumItems: PAGE_SIZE },
  )

  const projectUsers = useQuery(api.dashboard.getProjectUsers, { projectId })

  const userMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of allUsers) {
      map.set(`workos|${user.id}`, user.email ?? user.id)
    }
    return map
  }, [allUsers])

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleDateString()
  }

  const isLoading = status === 'LoadingFirstPage'
  const canLoadMore = status === 'CanLoadMore'
  const isLoadingMore = status === 'LoadingMore'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search tasks..."
            value={filters.searchLabel}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, searchLabel: e.target.value }))
            }
            className="w-[200px]"
          />

          <Select
            value={filters.status ?? 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                status: value === 'all' ? undefined : (value as TaskStatus),
              }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.assignedTo ?? 'all'}
            onValueChange={(value) => {
              const newValue =
                value === 'all' || value === null ? undefined : value
              setFilters((prev) => ({
                ...prev,
                assignedTo: newValue,
              }))
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {projectUsers?.map((user) => (
                <SelectItem key={user.userId} value={user.userId}>
                  {userMap.get(user.userId) ?? user.userId.split('|')[1]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.status || filters.assignedTo || filters.searchLabel) && (
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  status: undefined,
                  assignedTo: undefined,
                  searchLabel: '',
                })
              }
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead>Due By</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              <>
                {results.map((task) => (
                  <TableRow key={task._id}>
                    <TableCell className="font-medium">{task.label}</TableCell>
                    <TableCell>{formatDate(task.dueDate)}</TableCell>
                    <TableCell>
                      {task.assignedTo
                        ? (userMap.get(task.assignedTo) ?? 'Unknown')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {task.status ? (
                        <Badge variant={statusVariants[task.status]}>
                          {statusLabels[task.status]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Set</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {isLoadingMore && <TableSkeleton />}
              </>
            )}
          </TableBody>
        </Table>

        {/* Load More / Pagination */}
        {!isLoading && results.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {results.length} task{results.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              {canLoadMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMore(PAGE_SIZE)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
              )}
              {status === 'Exhausted' && (
                <span className="text-sm text-muted-foreground">
                  All tasks loaded
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
