import { createFileRoute } from '@tanstack/react-router';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@convex/_generated/api';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardContext } from '@/components/dashboard/context';
import { useState, useEffect } from 'react';
import type { Id } from '@convex/_generated/dataModel';

export const Route = createFileRoute('/_authenticated/project/$projectId/settings')({
  loader: async ({ context, params }) => {
    const projectId = params.projectId as Id<'projects'>;
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.projects.get, { projectId })),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const projectId = Route.useParams().projectId as Id<'projects'>;
  const { userRole } = useDashboardContext();
  const isCoach = userRole === 'coach';

  const { data: project } = useSuspenseQuery(convexQuery(api.projects.get, { projectId }));
  const updateProject = useConvexMutation(api.projects.update);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
    }
  }, [project]);

  const handleSave = async () => {
    if (!isCoach) {
      alert('Only coaches can edit project settings');
      return;
    }

    setIsSaving(true);
    try {
      await updateProject({
        projectId,
        name: name.trim(),
        description: description.trim(),
      });
      alert('Project settings saved successfully!');
    } catch (error) {
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isCoach) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only coaches can access project settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Project Settings</h1>
        <p className="text-muted-foreground">
          Manage project name and description. Only coaches can edit these settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Update the project name and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Project Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              className="w-full px-3 py-2 border rounded-md min-h-[100px]"
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

