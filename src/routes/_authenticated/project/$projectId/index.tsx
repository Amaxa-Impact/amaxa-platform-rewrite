import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@convex/_generated/api'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { Id } from '@convex/_generated/dataModel'
import { WorkOS } from '@workos-inc/node'
import { TaskStatusChart } from '@/components/dashboard/task-status-chart'
import { TasksTable } from '@/components/dashboard/tasks-table'
import { useDashboardContext } from '@/components/dashboard/context'

const workos = new WorkOS(process.env.WORKOS_API_KEY)

const fetchUsers = createServerFn({ method: 'GET' }).handler(async () => {
  const users = await workos.userManagement.listUsers()
  return users.data
})

export const Route = createFileRoute('/_authenticated/project/$projectId/')({
  loader: async ({ context, params }) => {
    const projectId = params.projectId as Id<'projects'>

    const [allUsers] = await Promise.all([
      fetchUsers(),
      context.queryClient.ensureQueryData(
        convexQuery(api.dashboard.getTaskStatusCounts, { projectId }),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.dashboard.getProjectUsers, { projectId }),
      ),
    ])

    return { allUsers }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { allUsers } = Route.useLoaderData()
  const projectId = Route.useParams().projectId as Id<'projects'>
  const { project } = useDashboardContext()

  const { data: statusCounts } = useSuspenseQuery(
    convexQuery(api.dashboard.getTaskStatusCounts, { projectId }),
  )

  return (
    <div className="flex flex-col gap-6 p-6 bg-background">
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-muted-foreground">Project Dashboard</p>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TaskStatusChart
          title="All Tasks"
          description="Task breakdown by status"
          data={statusCounts.allTasks}
          total={statusCounts.totalAll}
        />
        <TaskStatusChart
          title="My Tasks"
          description="Your assigned tasks by status"
          data={statusCounts.userTasks}
          total={statusCounts.totalUser}
        />
      </div>

      {/* Tasks Table */}
      <TasksTable projectId={projectId} allUsers={allUsers} />
    </div>
  )
}
