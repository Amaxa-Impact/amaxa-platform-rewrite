import { Link, useRouterState, useParams } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useDashboardContext } from './context'

const PAGE_NAMES: Record<string, string> = {
  '': 'Dashboard',
  tasks: 'Tasks',
  users: 'Users',
  settings: 'Settings',
}

export function BreadcrumbHeader() {
  const { project } = useDashboardContext()
  const router = useRouterState()
  const { projectId } = useParams({ strict: false })

  // Extract the current page from the pathname
  // Pattern: /project/{projectId}/{page}
  const pathParts = router.location.pathname.split('/').filter(Boolean)
  const projectIdFromPath = pathParts[1] // "project" is at index 0, projectId is at index 1
  const currentPageFromPath = pathParts[2] // page name is at index 2

  // If we're at /project/:projectId (no additional page), show Dashboard
  const currentPage = currentPageFromPath || ''
  const pageName = PAGE_NAMES[currentPage] || currentPage

  return (
    <header className="sticky top-0 z-10 bg-background border-b border-border">
      <div className="flex items-center gap-2 px-4 py-3">
        <SidebarTrigger className="-ml-1" />
        <div className="h-5 w-px bg-border" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Platform</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/project/${projectId || projectIdFromPath}`}>
                  {project.name || 'No Project Found'}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
