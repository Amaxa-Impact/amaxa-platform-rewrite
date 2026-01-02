import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { api } from '@convex/_generated/api';
import { Plus } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/applications/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(convexQuery(api.applicationForms.list, {}));
  },
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { data: forms } = useSuspenseQuery(convexQuery(api.applicationForms.list, {}));
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex flex-row items-center justify-between border-b p-4">
        <h1 className="text-2xl font-bold">Application Forms</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="ml-2">
              <Plus className="w-4 h-4" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <CreateFormDialog />
          </DialogContent>
        </Dialog>
      </header>

      <main className="flex-1 p-6">
        {forms.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <p>No application forms yet.</p>
            <p>Create your first form to start collecting applications.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form._id}>
                  <TableCell className="font-medium">{form.title}</TableCell>
                  <TableCell className="text-muted-foreground">/apply/{form.slug}</TableCell>
                  <TableCell>
                    <Badge variant={form.isPublished ? 'default' : 'secondary'}>
                      {form.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>{form.responseCount}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/applications/$formId/edit" params={{ formId: form._id }}>
                          Edit
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/applications/$formId/responses" params={{ formId: form._id }}>
                          Responses
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    </div>
  );
}

type CreateFormSchema = {
  title: string;
  description?: string;
  slug: string;
};

function CreateFormDialog() {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateFormSchema>({
    defaultValues: {
      title: '',
      description: '',
      slug: '',
    },
  });

  const createForm = useConvexMutation(api.applicationForms.create);

  const onSubmit = async (data: CreateFormSchema) => {
    // Validation: title and slug required, slug format
    if (!data.title.trim() || !data.slug.trim()) {
      toast.error('Title and slug are required');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(data.slug)) {
      toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    try {
      await createForm({
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        slug: data.slug.trim(),
      });
      toast.success('Form created successfully');
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create form');
    }
  };

  const generateSlug = () => {
    const title = getValues('title') || '';
    const generatedSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setValue('slug', generatedSlug);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Create Application Form</DialogTitle>
        <DialogDescription>Create a new form to collect applications.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...register('title', { required: true })}
            placeholder="e.g., Summer 2025 Program Application"
          />
          {errors.title && <span className="text-destructive text-xs">Title is required.</span>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe what this application is for..."
            rows={3}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="slug">URL Slug</Label>
            <Button type="button" variant="ghost" size="sm" onClick={generateSlug}>
              Generate from title
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">/apply/</span>
            <Input
              id="slug"
              {...register('slug', {
                required: true,
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'Slug can only contain lowercase letters, numbers, and hyphens',
                },
              })}
              placeholder="summer-2025"
              onChange={(e) => setValue('slug', e.target.value.toLowerCase())}
            />
          </div>
          {errors.slug && (
            <span className="text-destructive text-xs">{errors.slug.message || 'Slug is required.'}</span>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Form'}
        </Button>
      </DialogFooter>
    </form>
  );
}
