import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import * as z from "zod";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { AutoPaginatable } from "@workos-inc/node";
import type { User } from "@workos-inc/node";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/kibo-ui/combobox";

const formSchema = z.object({
  userId: z.string().min(1, "Please select a user."),
  role: z.enum(["coach", "member"], {
    message: "Please select a role.",
  }),
});

export function AddUserForm({
  allUsers,
  projectId,
  open,
  onOpenChange,
  existingUserIds,
}: {
  allUsers: AutoPaginatable<User>["data"];
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingUserIds?: string[];
}) {
  const assignUser = useConvexMutation(api.userToProject.assign);
  console.log(allUsers);


  
  const availableUsers = React.useMemo(() => {
    return allUsers
      .filter((user) => !existingUserIds?.includes(user.id))
      .map((user) => ({
        label: user.email || user.firstName || user.id,
        value: user.id,
      }));
  }, [allUsers, existingUserIds]);

  const form = useForm({
    defaultValues: {
      userId: "",
      role: "member" as "coach" | "member",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await assignUser({
          userId: value.userId,
          projectId,
          role: value.role,
        });
        toast.success("User added successfully", {
          description: `User has been added to the project as ${value.role}.`,
        });
        form.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error("Failed to add user", {
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred.",
        });
      }
    },
  });

  
  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User to Project</DialogTitle>
          <DialogDescription>
            Select a user and assign them a role in this project.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-user-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="userId"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="add-user-form-userId">User</FieldLabel>
                    <Combobox
                      data={availableUsers}
                      type="user"
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      open={undefined}
                      onOpenChange={undefined}
                    >
                      <ComboboxTrigger
                        id="add-user-form-userId"
                        className="w-full"
                        aria-invalid={isInvalid}
                      />
                      <ComboboxContent>
                        <ComboboxInput />
                        <ComboboxList>
                          <ComboboxEmpty>No users found.</ComboboxEmpty>
                          <ComboboxGroup>
                            {availableUsers.map((user) => (
                              <ComboboxItem
                                key={user.value}
                                value={user.value}
                              >
                                {user.label}
                              </ComboboxItem>
                            ))}
                          </ComboboxGroup>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldDescription>
                      Search and select a user to add to this project.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="role"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                const roleOptions = [
                  { label: "Member", value: "member" },
                  { label: "Coach", value: "coach" },
                ];

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="add-user-form-role">Role</FieldLabel>
                    <Combobox
                      data={roleOptions}
                      type="role"
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as "coach" | "member")}
                      open={undefined}
                      onOpenChange={undefined}
                    >
                      <ComboboxTrigger
                        id="add-user-form-role"
                        className="w-full"
                        aria-invalid={isInvalid}
                      />
                      <ComboboxContent>
                        <ComboboxInput />
                        <ComboboxList>
                          <ComboboxEmpty>No roles found.</ComboboxEmpty>
                          <ComboboxGroup>
                            {roleOptions.map((role) => (
                              <ComboboxItem key={role.value} value={role.value}>
                                {role.label}
                              </ComboboxItem>
                            ))}
                          </ComboboxGroup>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldDescription>
                      Choose the role for this user in the project.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-user-form">
            Add User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
