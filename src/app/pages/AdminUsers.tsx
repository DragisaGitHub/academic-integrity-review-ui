import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, Power, RefreshCcw, Shield, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { HttpError } from '../api';
import { getUserBackendId } from '../services/userMapping';
import { createUserToApi, listUsersFromApi, resetUserPasswordByIdToApi, updateUserByIdToApi } from '../services/users';
import type { AppUser, CreateUserRequest, UpdateUserRequest, UserRole } from '../types';

type CreateFormState = CreateUserRequest & { confirmPassword: string };
type EditFormState = { displayName: string; role: UserRole; enabled: boolean };
type ResetPasswordState = { newPassword: string; confirmPassword: string };

const defaultCreateFormState: CreateFormState = {
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  role: 'USER',
  enabled: true,
};

const defaultResetPasswordState: ResetPasswordState = {
  newPassword: '',
  confirmPassword: '',
};

function roleBadgeClass(role: UserRole): string {
  return role === 'ADMIN'
    ? 'bg-slate-900 text-white border-slate-900'
    : 'bg-slate-100 text-slate-700 border-slate-200';
}

function statusBadgeClass(enabled: boolean): string {
  return enabled
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';
}

function validateCreateForm(form: CreateFormState): string {
  if (!form.username.trim()) return 'Username is required.';
  if (!form.displayName.trim()) return 'Display name is required.';
  if (!/^[a-zA-Z0-9._-]+$/.test(form.username.trim())) return 'Username can only contain letters, numbers, dot, underscore, or dash.';
  if (form.password.length < 8) return 'Password must be at least 8 characters long.';
  if (form.password !== form.confirmPassword) return 'Password and confirmation must match.';
  return '';
}

function validateEditForm(form: EditFormState): string {
  if (!form.displayName.trim()) return 'Display name is required.';
  return '';
}

function validateResetPasswordForm(form: ResetPasswordState): string {
  if (form.newPassword.length < 8) return 'New password must be at least 8 characters long.';
  if (form.newPassword !== form.confirmPassword) return 'New password and confirmation must match.';
  return '';
}

export function AdminUsers() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(defaultCreateFormState);
  const [createFormError, setCreateFormError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ displayName: '', role: 'USER', enabled: true });
  const [editFormError, setEditFormError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [passwordResetUser, setPasswordResetUser] = useState<AppUser | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordState>(defaultResetPasswordState);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [toggleTargetUser, setToggleTargetUser] = useState<AppUser | null>(null);
  const [isTogglingUserState, setIsTogglingUserState] = useState(false);

  const isEmpty = useMemo(() => !isLoading && !hasLoadError && users.length === 0, [hasLoadError, isLoading, users.length]);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers(): Promise<void> {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const nextUsers = await listUsersFromApi();
      setUsers(nextUsers);
    } catch (error) {
      console.error('Failed to load users', error);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function openEditDialog(user: AppUser): void {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName,
      role: user.role,
      enabled: user.enabled,
    });
    setEditFormError('');
  }

  async function handleCreateUser(): Promise<void> {
    const validationError = validateCreateForm(createForm);
    if (validationError) {
      setCreateFormError(validationError);
      return;
    }

    setCreateFormError('');
    setIsCreating(true);

    try {
      const createdUser = await createUserToApi({
        username: createForm.username.trim(),
        displayName: createForm.displayName.trim(),
        password: createForm.password,
        role: createForm.role,
        enabled: createForm.enabled,
      });
      setUsers((previous) => [...previous, createdUser].sort((left, right) => left.username.localeCompare(right.username)));
      setIsCreateDialogOpen(false);
      setCreateForm(defaultCreateFormState);
      toast.success('User created.');
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        setCreateFormError('A user with this username already exists.');
      } else {
        setCreateFormError('Could not create user.');
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editingUser) return;

    const validationError = validateEditForm(editForm);
    if (validationError) {
      setEditFormError(validationError);
      return;
    }

    const isSelf = editingUser.id === currentUser?.id || editingUser.username === currentUser?.username;
    if (isSelf && !editForm.enabled) {
      setEditFormError('You cannot disable your own account.');
      return;
    }
    if (isSelf && editForm.role !== 'ADMIN') {
      setEditFormError('You cannot remove your own admin role.');
      return;
    }

    setEditFormError('');
    setIsSavingEdit(true);

    const request: UpdateUserRequest = {
      displayName: editForm.displayName.trim(),
      role: editForm.role,
      enabled: editForm.enabled,
    };

    try {
      const targetUserId = getUserBackendId(editingUser);
      const updatedUser = await updateUserByIdToApi(targetUserId, request);
      setUsers((previous) => previous.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setEditingUser(null);
      toast.success('User updated.');
    } catch (error) {
      console.error('Failed to update user', error);
      setEditFormError('Could not update user.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleResetPassword(): Promise<void> {
    if (!passwordResetUser) return;

    const validationError = validateResetPasswordForm(resetPasswordForm);
    if (validationError) {
      setResetPasswordError(validationError);
      return;
    }

    setResetPasswordError('');
    setIsResettingPassword(true);

    try {
      const targetUserId = getUserBackendId(passwordResetUser);
      await resetUserPasswordByIdToApi(targetUserId, { newPassword: resetPasswordForm.newPassword });
      setPasswordResetUser(null);
      setResetPasswordForm(defaultResetPasswordState);
      toast.success('Password reset successfully.');
    } catch (error) {
      console.error('Failed to reset password', error);
      setResetPasswordError('Could not reset password.');
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleToggleUserState(): Promise<void> {
    if (!toggleTargetUser) return;

    const isSelf = toggleTargetUser.id === currentUser?.id || toggleTargetUser.username === currentUser?.username;
    if (isSelf && toggleTargetUser.enabled) {
      toast.error('You cannot disable your own account.');
      setToggleTargetUser(null);
      return;
    }

    setIsTogglingUserState(true);
    try {
      const targetUserId = getUserBackendId(toggleTargetUser);
      const updatedUser = await updateUserByIdToApi(targetUserId, {
        displayName: toggleTargetUser.displayName,
        role: toggleTargetUser.role,
        enabled: !toggleTargetUser.enabled,
      });
      setUsers((previous) => previous.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setToggleTargetUser(null);
      toast.success(updatedUser.enabled ? 'User enabled.' : 'User disabled.');
    } catch (error) {
      console.error('Failed to update user status', error);
      toast.error('Could not update user status.');
    } finally {
      setIsTogglingUserState(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-foreground mb-1">User Management</h2>
          <p className="text-sm text-muted-foreground">Create and manage application users and access.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Application Users
          </CardTitle>
          <CardDescription>Admins can create accounts, update roles, reset passwords, and manage access.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : hasLoadError ? (
            <div className="p-12 text-center space-y-4">
              <p className="text-sm text-muted-foreground">Could not load users from the backend.</p>
              <Button variant="outline" onClick={() => void loadUsers()}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : isEmpty ? (
            <div className="p-12 text-center space-y-3">
              <UserPlus className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No users found. Create the first user to get started.</p>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>Create User</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Username</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id || user.username === currentUser?.username;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm text-foreground">{user.username}</p>
                          {isSelf ? <p className="text-xs text-muted-foreground">Current user</p> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{user.displayName || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleBadgeClass(user.role)}>
                          {user.role === 'ADMIN' ? <Shield className="h-3 w-3 mr-1" /> : null}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(user.enabled)}>
                          {user.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setPasswordResetUser(user);
                            setResetPasswordError('');
                            setResetPasswordForm(defaultResetPasswordState);
                          }}>
                            <KeyRound className="h-4 w-4 mr-2" />
                            Reset Password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setToggleTargetUser(user)}
                            disabled={isSelf && user.enabled}
                            title={isSelf && user.enabled ? 'You cannot disable your own account.' : undefined}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {user.enabled ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new application user account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-username">Username</Label>
              <Input id="create-username" value={createForm.username} onChange={(event) => setCreateForm((previous) => ({ ...previous, username: event.target.value }))} disabled={isCreating} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-display-name">Display Name</Label>
              <Input id="create-display-name" value={createForm.displayName} onChange={(event) => setCreateForm((previous) => ({ ...previous, displayName: event.target.value }))} disabled={isCreating} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-password">Password</Label>
                <Input id="create-password" type="password" value={createForm.password} onChange={(event) => setCreateForm((previous) => ({ ...previous, password: event.target.value }))} disabled={isCreating} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-confirm-password">Confirm Password</Label>
                <Input id="create-confirm-password" type="password" value={createForm.confirmPassword} onChange={(event) => setCreateForm((previous) => ({ ...previous, confirmPassword: event.target.value }))} disabled={isCreating} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm((previous) => ({ ...previous, role: value as UserRole }))}>
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <Label htmlFor="create-enabled">Enabled</Label>
                <Switch id="create-enabled" checked={createForm.enabled} onCheckedChange={(checked) => setCreateForm((previous) => ({ ...previous, enabled: checked }))} />
              </div>
            </div>
            {createFormError ? <p className="text-sm text-destructive">{createFormError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>Cancel</Button>
            <Button onClick={() => void handleCreateUser()} disabled={isCreating}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => {
        if (!open && !isSavingEdit) {
          setEditingUser(null);
          setEditFormError('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update profile, role, and access state for {editingUser?.username}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input id="edit-username" value={editingUser?.username ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input id="edit-display-name" value={editForm.displayName} onChange={(event) => setEditForm((previous) => ({ ...previous, displayName: event.target.value }))} disabled={isSavingEdit} />
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm((previous) => ({ ...previous, role: value as UserRole }))} disabled={isSavingEdit}>
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <Label htmlFor="edit-enabled">Enabled</Label>
                <Switch id="edit-enabled" checked={editForm.enabled} onCheckedChange={(checked) => setEditForm((previous) => ({ ...previous, enabled: checked }))} disabled={isSavingEdit} />
              </div>
            </div>
            {editFormError ? <p className="text-sm text-destructive">{editFormError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={isSavingEdit}>Cancel</Button>
            <Button onClick={() => void handleSaveEdit()} disabled={isSavingEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(passwordResetUser)} onOpenChange={(open) => {
        if (!open && !isResettingPassword) {
          setPasswordResetUser(null);
          setResetPasswordForm(defaultResetPasswordState);
          setResetPasswordError('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {passwordResetUser?.username}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">New Password</Label>
              <Input id="reset-new-password" type="password" value={resetPasswordForm.newPassword} onChange={(event) => setResetPasswordForm((previous) => ({ ...previous, newPassword: event.target.value }))} disabled={isResettingPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm Password</Label>
              <Input id="reset-confirm-password" type="password" value={resetPasswordForm.confirmPassword} onChange={(event) => setResetPasswordForm((previous) => ({ ...previous, confirmPassword: event.target.value }))} disabled={isResettingPassword} />
            </div>
            {resetPasswordError ? <p className="text-sm text-destructive">{resetPasswordError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordResetUser(null)} disabled={isResettingPassword}>Cancel</Button>
            <Button onClick={() => void handleResetPassword()} disabled={isResettingPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(toggleTargetUser)} onOpenChange={(open) => {
        if (!open && !isTogglingUserState) {
          setToggleTargetUser(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleTargetUser?.enabled ? 'Disable User' : 'Enable User'}</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTargetUser
                ? `Are you sure you want to ${toggleTargetUser.enabled ? 'disable' : 'enable'} ${toggleTargetUser.username}?`
                : 'Confirm this action.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingUserState}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => {
              event.preventDefault();
              void handleToggleUserState();
            }} disabled={isTogglingUserState}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}