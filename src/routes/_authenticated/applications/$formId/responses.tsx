import { Link, createFileRoute } from '@tanstack/react-router';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { toast } from 'sonner';

type ResponseStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected';

export const Route = createFileRoute(
  '/_authenticated/applications/$formId/responses'
)({
  loader: async ({ context, params }) => {
    const formId = params.formId as Id<'applicationForms'>;
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.applicationForms.get, { formId })
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.applicationResponses.list, { formId })
      ),
    ]);
  },
  component: ResponsesPage,
});

function ResponsesPage() {
  const { formId } = Route.useParams();
  const typedFormId = formId as Id<'applicationForms'>;

  const { data: form } = useSuspenseQuery(
    convexQuery(api.applicationForms.get, { formId: typedFormId })
  );
  const { data: responses } = useSuspenseQuery(
    convexQuery(api.applicationResponses.list, { formId: typedFormId })
  );

  const [selectedResponseId, setSelectedResponseId] =
    useState<Id<'applicationResponses'> | null>(null);
  const [statusFilter, setStatusFilter] = useState<ResponseStatus | 'all'>('all');

  if (!form) {
    return <div className="p-6">Form not found</div>;
  }

  const filteredResponses =
    statusFilter === 'all'
      ? responses
      : responses.filter((r) => r.status === statusFilter);

  const statusCounts = {
    all: responses.length,
    pending: responses.filter((r) => r.status === 'pending').length,
    reviewed: responses.filter((r) => r.status === 'reviewed').length,
    accepted: responses.filter((r) => r.status === 'accepted').length,
    rejected: responses.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-background p-4 border-b">
        <div className="flex flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/applications/$formId/edit"
              params={{ formId }}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Form
            </Link>
            <h1 className="text-2xl font-bold">{form.title} - Responses</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {responses.length} total responses
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Filters */}
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({statusCounts.all})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({statusCounts.pending})
            </Button>
            <Button
              variant={statusFilter === 'reviewed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('reviewed')}
            >
              Reviewed ({statusCounts.reviewed})
            </Button>
            <Button
              variant={statusFilter === 'accepted' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('accepted')}
            >
              Accepted ({statusCounts.accepted})
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected ({statusCounts.rejected})
            </Button>
          </div>

          {/* Responses Table */}
          {filteredResponses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {responses.length === 0
                  ? 'No applications have been submitted yet.'
                  : 'No applications match the selected filter.'}
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => (
                  <ResponseRow
                    key={response._id}
                    response={response}
                    onView={() => setSelectedResponseId(response._id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Response Detail Dialog */}
        <Dialog
          open={selectedResponseId !== null}
          onOpenChange={(open) => !open && setSelectedResponseId(null)}
        >
          {selectedResponseId && (
            <ResponseDetailDialog
              responseId={selectedResponseId}
              onClose={() => setSelectedResponseId(null)}
            />
          )}
        </Dialog>
      </main>
    </div>
  );
}

function ResponseRow({
  response,
  onView,
}: {
  response: {
    _id: Id<'applicationResponses'>;
    applicantName: string;
    applicantEmail: string;
    submittedAt: number;
    status: ResponseStatus;
  };
  onView: () => void;
}) {
  const updateStatus = useConvexMutation(api.applicationResponses.updateStatus);
  const deleteResponse = useConvexMutation(api.applicationResponses.remove);

  const handleStatusChange = async (newStatus: ResponseStatus) => {
    try {
      await updateStatus({
        responseId: response._id,
        status: newStatus,
      });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this application?')) {
      return;
    }
    try {
      await deleteResponse({ responseId: response._id });
      toast.success('Application deleted');
    } catch (error) {
      toast.error('Failed to delete application');
    }
  };

  const statusVariants: Record<ResponseStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    reviewed: 'outline',
    accepted: 'default',
    rejected: 'destructive',
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{response.applicantName}</TableCell>
      <TableCell>{response.applicantEmail}</TableCell>
      <TableCell>
        {new Date(response.submittedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </TableCell>
      <TableCell>
        <Select
          value={response.status}
          onValueChange={(v) => handleStatusChange(v as ResponseStatus)}
        >
          <SelectTrigger className="w-32">
            <Badge variant={statusVariants[response.status]}>
              {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onView}>
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ResponseDetailDialog({
  responseId,
  onClose,
}: {
  responseId: Id<'applicationResponses'>;
  onClose: () => void;
}) {
  const { data: response } = useSuspenseQuery(
    convexQuery(api.applicationResponses.get, { responseId })
  );
  const updateStatus = useConvexMutation(api.applicationResponses.updateStatus);

  if (!response) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Response not found</DialogTitle>
        </DialogHeader>
      </DialogContent>
    );
  }

  const handleStatusChange = async (newStatus: ResponseStatus) => {
    try {
      await updateStatus({
        responseId: response._id,
        status: newStatus,
      });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const statusVariants: Record<ResponseStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    reviewed: 'outline',
    accepted: 'default',
    rejected: 'destructive',
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Application from {response.applicantName}</DialogTitle>
        <DialogDescription>
          Submitted on{' '}
          {new Date(response.submittedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Status:</span>
          <Select
            value={response.status}
            onValueChange={(v) => handleStatusChange(v as ResponseStatus)}
          >
            <SelectTrigger className="w-40">
              <Badge variant={statusVariants[response.status]}>
                {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applicant Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applicant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Name:</span>
              <p className="font-medium">{response.applicantName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Email:</span>
              <p className="font-medium">
                <a
                  href={`mailto:${response.applicantEmail}`}
                  className="text-primary hover:underline"
                >
                  {response.applicantEmail}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Field Responses */}
        {response.fieldResponses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Responses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {response.fieldResponses.map((fr, index) => (
                <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">
                    {fr.fieldLabel}
                  </span>
                  <div className="mt-1">
                    {Array.isArray(fr.value) ? (
                      <div className="flex flex-wrap gap-1">
                        {fr.value.map((v, i) => (
                          <Badge key={i} variant="secondary">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{fr.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DialogContent>
  );
}

