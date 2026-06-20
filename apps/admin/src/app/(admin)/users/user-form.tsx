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
import { Button } from '@iws/ui';
import { Input } from '@iws/ui';
import { Label } from '@iws/ui';
import { SimpleSelect } from '@iws/ui';

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
  const queryClient = useQueryClient();
  const create = useUsersControllerCreate();
  const update = useUsersControllerUpdate();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? Role.STAFF);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      {!isEdit && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </>
      )}
      <div className="flex flex-col gap-2">
        <Label>Role</Label>
        <SimpleSelect
          aria-label="Role"
          className="w-full"
          value={role}
          onValueChange={(v) => setRole(v as Role)}
          options={Object.values(Role).map((r) => ({ value: r, label: r }))}
          placeholder="Select a role"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit">{isEdit ? 'Save' : 'Create'}</Button>
      </div>
    </form>
  );
}
