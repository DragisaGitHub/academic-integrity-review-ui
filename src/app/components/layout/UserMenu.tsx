import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, KeyRound, LogOut, Shield, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../auth/AuthContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function roleBadgeClass(role: 'ADMIN' | 'USER'): string {
  return role === 'ADMIN'
    ? 'bg-slate-900 text-white border-slate-900'
    : 'bg-slate-100 text-slate-700 border-slate-200';
}

export function UserMenu() {
  const navigate = useNavigate();
  const { changeOwnPassword, currentUser, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isPasswordDialogOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    }
  }, [isPasswordDialogOpen]);

  if (!currentUser) {
    return null;
  }

  const visibleDisplayName = currentUser.displayName || currentUser.username;

  async function handleChangePassword(): Promise<void> {
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedCurrentPassword || !trimmedNewPassword || !trimmedConfirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (trimmedNewPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setPasswordError('New password and confirmation must match.');
      return;
    }

    setPasswordError('');
    setIsSubmitting(true);

    try {
      await changeOwnPassword({
        currentPassword: trimmedCurrentPassword,
        newPassword: trimmedNewPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordDialogOpen(false);
      toast.success('Password updated.');
    } catch (error) {
      console.error('Failed to change password', error);
      setPasswordError('Could not change password. Please verify your current password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout(): void {
    setIsMenuOpen(false);
    setIsPasswordDialogOpen(false);
    logout();
    toast.success('Signed out.');
    navigate('/login', { replace: true });
  }

  function openPasswordDialog(): void {
    setIsMenuOpen(false);
    setPasswordError('');
    setIsPasswordDialogOpen(true);
  }

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-auto min-w-[220px] justify-between gap-3 px-3 py-2 text-left"
            aria-label={`Account menu for ${visibleDisplayName}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserRound className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{visibleDisplayName}</p>
                <p className="truncate text-xs text-muted-foreground">Signed in as {currentUser.username}</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{visibleDisplayName}</p>
                <p className="text-xs text-muted-foreground">{currentUser.username}</p>
              </div>
              <Badge variant="outline" className={roleBadgeClass(currentUser.role)}>
                {currentUser.role === 'ADMIN' ? <Shield className="h-3 w-3 mr-1" /> : null}
                {currentUser.role}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={openPasswordDialog}>
            <KeyRound className="h-4 w-4" />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleLogout} variant="destructive">
            <LogOut className="h-4 w-4" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Update your account password.</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleChangePassword();
            }}
          >
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{visibleDisplayName}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsPasswordDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}