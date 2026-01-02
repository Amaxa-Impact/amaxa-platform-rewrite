import { createFileRoute } from '@tanstack/react-router';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@convex/_generated/api';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardContext } from '@/components/dashboard/context';
import { useState } from 'react';
import type { Id } from '@convex/_generated/dataModel';
import type { User } from '@workos-inc/node';
import { AddUserForm } from './-components/add-user-form';

export const Route = createFileRoute('/_authenticated/project/$projectId/users')({
  loader: async ({ context, params }) => {
    const projectId = params.projectId as Id<'projects'>;
    await context.queryClient.ensureQueryData(convexQuery(api.userToProject.listUsersForProject, { projectId }));
    
    const allUsers = (await fetch('/api/list-users').then((res) => res.json())) as User[];
    return { allUsers };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const projectId = Route.useParams().projectId as Id<'projects'>;
  const { userRole } = useDashboardContext();
  const isCoach = userRole === 'coach';

  const { data: existingUsers } = useSuspenseQuery(convexQuery(api.userToProject.listUsersForProject, { projectId }));

  const removeUser = useConvexMutation(api.userToProject.remove);
  const updateRole = useConvexMutation(api.userToProject.updateRole);

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  
  const existingUserIds = existingUsers.map((user) => user.userId);

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the project?')) return;
    try {
      await removeUser({ userId, projectId });
    } catch (error) {
      alert(`Failed to remove user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateRole = async (userId: string, role: 'coach' | 'member') => {
    try {
      await updateRole({ userId, projectId, role });
    } catch (error) {
      alert(`Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Project Users</h1>
          <p className="text-muted-foreground">
            Manage users and their roles in this project. Your role: <strong>{userRole || 'None'}</strong>
          </p>
        </div>

        {isCoach && (
          <>
            <div className="mb-6">
              <Button onClick={() => setIsAddUserDialogOpen(true)}>Add User</Button>
            </div>
            <AddUserForm
              allUsers={data.allUsers}
              projectId={projectId}
              open={isAddUserDialogOpen}
              onOpenChange={setIsAddUserDialogOpen}
              existingUserIds={existingUserIds}
            />
          </>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users ({existingUsers.length})</CardTitle>
          <CardDescription>All users with access to this project</CardDescription>
        </CardHeader>
        <CardContent>
          {existingUsers.length === 0 ? (
            <p className="text-muted-foreground">No users found in this project.</p>
          ) : (
            <div className="space-y-2">
              {existingUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {data.allUsers.find((u) => u.id === user.userId.split('|')[1])?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Role: <span className="capitalize">{user.role}</span>
                    </p>
                  </div>
                  {isCoach && (
                    <div className="flex gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.userId, e.target.value as 'coach' | 'member')}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="member">Member</option>
                        <option value="coach">Coach</option>
                      </select>
                      <Button variant="destructive" onClick={() => handleRemoveUser(user.userId)}>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
