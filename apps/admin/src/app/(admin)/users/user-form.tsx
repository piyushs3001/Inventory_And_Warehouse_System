'use client';

import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUsersControllerCreate,
  useUsersControllerUpdate,
  getUsersControllerFindAllQueryKey,
} from '@iws/api-client';
import type { UserDto } from '@iws/api-client';
import { Role } from '@iws/api-client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  FormActions,
  FormField,
  FormGrid,
  SimpleSelect,
} from '@iws/ui';

/**
 * Create/edit user form (no Dialog wrapper — rendered on dedicated routes).
 * Creates when no `user` is passed, otherwise patches the existing user.
 * Email/password are create-only: the API's UpdateUserDto has no password field.
 */
export function UserForm({
  user,
  onDone,
}: {
  user?: UserDto;
  onDone: () => void;
}) {
  const isEdit = Boolean(user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useUsersControllerCreate();
  const update = useUsersControllerUpdate();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? Role.STAFF);
  const [error, setError] = useState<string | null>(null);

  const isPending = create.isPending || update.isPending;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getUsersControllerFindAllQueryKey() });

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && user) {
        await update.mutateAsync({ id: user.id, data: { name, role } });
      } else {
        await create.mutateAsync({ data: { name, email, password, role } });
      }
      await invalidate();
      onDone();
    } catch {
      setError('Could not save user');
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Name" htmlFor="user-name" required>
        <Input
          id="user-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </FormField>
      {!isEdit && (
        <FormGrid cols={2}>
          <FormField label="Email" htmlFor="user-email" required>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Password" htmlFor="user-password" required>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </FormField>
        </FormGrid>
      )}
      <FormField label="Role" htmlFor="user-role">
        <SimpleSelect
          aria-label="Role"
          className="w-full"
          value={role}
          onValueChange={(v) => setRole(v as Role)}
          options={Object.values(Role).map((r) => ({ value: r, label: r }))}
          placeholder="Select a role"
        />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.push('/users')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </FormActions>
    </form>
  );
}
