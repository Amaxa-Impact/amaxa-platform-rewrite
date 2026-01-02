import { Link, createFileRoute } from '@tanstack/react-router'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { toast } from 'sonner'

type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect'

interface Field {
  _id: Id<'applicationFormFields'>
  label: string
  description?: string
  type: FieldType
  required: boolean
  order: number
  options?: string[]
  min?: number
  max?: number
}

export const Route = createFileRoute(
  '/_authenticated/applications/$formId/edit',
)({
  loader: async ({ context, params }) => {
    const formId = params.formId as Id<'applicationForms'>
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.applicationForms.get, { formId }),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.applicationFormFields.listByForm, { formId }),
      ),
    ])
  },
  component: FormEditorPage,
})

function FormEditorPage() {
  const { formId } = Route.useParams()
  const typedFormId = formId as Id<'applicationForms'>

  const { data: form } = useSuspenseQuery(
    convexQuery(api.applicationForms.get, { formId: typedFormId }),
  )
  const { data: fields } = useSuspenseQuery(
    convexQuery(api.applicationFormFields.listByForm, { formId: typedFormId }),
  )

  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false)
  const [editingField, setEditingField] = useState<Field | null>(null)

  const updateForm = useConvexMutation(api.applicationForms.update)
  const deleteForm = useConvexMutation(api.applicationForms.remove)

  if (!form) {
    return <div className="p-6">Form not found</div>
  }

  const handleTogglePublish = async () => {
    try {
      await updateForm({
        formId: typedFormId,
        isPublished: !form.isPublished,
      })
      toast.success(form.isPublished ? 'Form unpublished' : 'Form published')
    } catch (error) {
      toast.error('Failed to update form')
    }
  }

  const handleDeleteForm = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this form? This action cannot be undone.',
      )
    ) {
      return
    }
    try {
      await deleteForm({ formId: typedFormId })
      toast.success('Form deleted')
      window.location.href = '/applications'
    } catch (error) {
      toast.error('Failed to delete form')
    }
  }

  const publicUrl = `/apply/${form.slug}`

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-background p-4 border-b">
        <div className="flex flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/applications"
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold">{form.title}</h1>
            <Badge variant={form.isPublished ? 'default' : 'secondary'}>
              {form.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <div className="flex gap-2">
            {form.isPublished && (
              <Button variant="outline">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  View Public Form
                </a>
              </Button>
            )}
            <Button
              variant={form.isPublished ? 'outline' : 'default'}
              onClick={handleTogglePublish}
            >
              {form.isPublished ? 'Unpublish' : 'Publish'}
            </Button>
            <Button variant="destructive" onClick={handleDeleteForm}>
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Form Details Section */}
          <FormDetailsEditor form={form} formId={typedFormId} />

          {/* Fields Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Form Fields</CardTitle>
              <AlertDialog
                open={isAddFieldOpen}
                onOpenChange={setIsAddFieldOpen}
              >
                <AlertDialogTrigger>
                  <Button>Add Field</Button>
                </AlertDialogTrigger>
                <FieldEditorDialog
                  formId={typedFormId}
                  onSuccess={() => setIsAddFieldOpen(false)}
                />
              </AlertDialog>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No fields yet.</p>
                  <p>Add fields to start building your application form.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <FieldCard
                      key={field._id}
                      field={field as Field}
                      onEdit={() => setEditingField(field as Field)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Field Dialog */}
        <AlertDialog
          open={editingField !== null}
          onOpenChange={(open) => !open && setEditingField(null)}
        >
          {editingField && (
            <FieldEditorDialog
              formId={typedFormId}
              field={editingField}
              onSuccess={() => setEditingField(null)}
            />
          )}
        </AlertDialog>
      </main>
    </div>
  )
}

function FormDetailsEditor({
  form,
  formId,
}: {
  form: NonNullable<Awaited<ReturnType<typeof api.applicationForms.get>>>
  formId: Id<'applicationForms'>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(form.title)
  const [description, setDescription] = useState(form.description ?? '')
  const [slug, setSlug] = useState(form.slug)

  const updateForm = useConvexMutation(api.applicationForms.update)

  const handleSave = async () => {
    try {
      await updateForm({
        formId,
        title: title.trim(),
        description: description.trim() || undefined,
        slug: slug.trim(),
      })
      toast.success('Form updated')
      setIsEditing(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update form',
      )
    }
  }

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Form Details</CardTitle>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Title</Label>
            <p className="font-medium">{form.title}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="font-medium">
              {form.description || 'No description'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Public URL</Label>
            <p className="font-mono text-sm">/apply/{form.slug}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Form Details</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">URL Slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/apply/</span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FieldCard({ field, onEdit }: { field: Field; onEdit: () => void }) {
  const deleteField = useConvexMutation(api.applicationFormFields.remove)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this field?')) {
      return
    }
    try {
      await deleteField({ fieldId: field._id })
      toast.success('Field deleted')
    } catch (error) {
      toast.error('Failed to delete field')
    }
  }

  const fieldTypeLabels: Record<FieldType, string> = {
    text: 'Short Text',
    textarea: 'Long Text',
    number: 'Number',
    select: 'Dropdown',
    multiselect: 'Multiple Select',
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{field.label}</span>
          {field.required && (
            <Badge variant="outline" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {fieldTypeLabels[field.type]}
          {field.options && field.options.length > 0 && (
            <span> · {field.options.length} options</span>
          )}
        </div>
        {field.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {field.description}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
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
    </div>
  )
}

function FieldEditorDialog({
  formId,
  field,
  onSuccess,
}: {
  formId: Id<'applicationForms'>
  field?: Field
  onSuccess: () => void
}) {
  const isEditing = !!field

  const [label, setLabel] = useState(field?.label ?? '')
  const [description, setDescription] = useState(field?.description ?? '')
  const [type, setType] = useState<FieldType>(field?.type ?? 'text')
  const [required, setRequired] = useState(field?.required ?? false)
  const [options, setOptions] = useState<string[]>(field?.options ?? [])
  const [newOption, setNewOption] = useState('')
  const [min, setMin] = useState<string>(field?.min?.toString() ?? '')
  const [max, setMax] = useState<string>(field?.max?.toString() ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createField = useConvexMutation(api.applicationFormFields.create)
  const updateField = useConvexMutation(api.applicationFormFields.update)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!label.trim()) {
      toast.error('Label is required')
      return
    }

    if ((type === 'select' || type === 'multiselect') && options.length === 0) {
      toast.error('At least one option is required for dropdown/multiselect')
      return
    }

    setIsSubmitting(true)
    try {
      const fieldData = {
        label: label.trim(),
        description: description.trim() || undefined,
        type,
        required,
        options:
          type === 'select' || type === 'multiselect' ? options : undefined,
        min: type === 'number' && min ? parseFloat(min) : undefined,
        max: type === 'number' && max ? parseFloat(max) : undefined,
      }

      if (isEditing) {
        await updateField({
          fieldId: field._id,
          ...fieldData,
        })
        toast.success('Field updated')
      } else {
        await createField({
          formId,
          ...fieldData,
        })
        toast.success('Field created')
      }
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save field',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()])
      setNewOption('')
    }
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  return (
    <AlertDialogContent className="max-w-lg">
      <form onSubmit={handleSubmit}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isEditing ? 'Edit Field' : 'Add Field'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Configure the field properties.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Full Name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="field-description">Help Text (optional)</Label>
            <Input
              id="field-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional instructions for this field"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="field-type">Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Short Text</SelectItem>
                <SelectItem value="textarea">Long Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="select">Dropdown (Single Select)</SelectItem>
                <SelectItem value="multiselect">Multiple Select</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="field-min">Minimum (optional)</Label>
                <Input
                  id="field-min"
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="field-max">Maximum (optional)</Label>
                <Input
                  id="field-max"
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                />
              </div>
            </div>
          )}

          {(type === 'select' || type === 'multiselect') && (
            <div className="grid gap-2">
              <Label>Options</Label>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add an option"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOption()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addOption}>
                  Add
                </Button>
              </div>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {options.map((option, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeOption(index)}
                    >
                      {option} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="field-required"
              checked={required}
              onCheckedChange={(checked) => setRequired(checked === true)}
            />
            <Label htmlFor="field-required" className="cursor-pointer">
              Required field
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : isEditing
                ? 'Update Field'
                : 'Add Field'}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  )
}
