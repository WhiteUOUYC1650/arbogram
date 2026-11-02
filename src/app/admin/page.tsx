"use client";

import { useFirestore, useUser, useDoc, useCollection } from '@/firebase';
import { AuthGuard } from '@/components/auth-guard';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Ban, UserCheck, Loader2, Key, ArrowLeft, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { APP_NAME, APP_VERSION_LABEL } from '@/lib/brand';

export default function AdminPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useDoc(user ? doc(db!, 'users', user.uid) : null);
  const userUsername = userRef.data?.username?.toLowerCase() || '';
  const isAdmin = userUsername === '@nexus90kyt' || userUsername === '@white';

  const usersQuery = collection(db!, 'users');
  const { data: allUsers, loading: usersLoading } = useCollection(usersQuery);

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPin, setNewPin] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !userRef.loading && !isAdmin && userUsername !== '') {
      router.push('/');
    }
  }, [isAdmin, userRef.loading, authLoading, router, userUsername]);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    const term = search.trim().toLowerCase().replace(/^@/, '');
    if (!term) return allUsers;
    return allUsers.filter(
      (u: any) =>
        u.displayName?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().replace(/^@/, '').includes(term),
    );
  }, [allUsers, search]);

  const handleBan = async (targetUid: string, isBanned: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', targetUid), { isBanned: !isBanned });
      toast({
        title: isBanned ? 'Пользователь разбанен' : 'Пользователь забанен',
        variant: isBanned ? 'default' : 'destructive',
      });
    } catch (e) {
      toast({ title: 'Ошибка прав', variant: 'destructive' });
    }
  };

  const handleSetPin = async () => {
    if (!db || !selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), { secretPin: newPin });
      toast({ title: 'ПИН-код обновлён' });
      setPinDialogOpen(false);
      setNewPin('');
    } catch (e) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  if (authLoading || userRef.loading || (!isAdmin && userUsername !== '')) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
        <header className="shrink-0 border-b border-outline-variant/60 bg-surface-low/95 px-4 py-4 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => router.push('/')}
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold tracking-tight text-on-surface">
                Админ-панель
              </h1>
              <p className="truncate text-[11px] text-on-surface-variant">
                {APP_NAME} {APP_VERSION_LABEL} · {allUsers?.length || 0} пользователей
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <Input
                placeholder="Поиск по имени или @юзернейму"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-full border-none bg-surface-high pl-11"
              />
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-outline-variant px-6 py-16 text-center">
                <Users className="h-8 w-8 text-on-surface-variant" />
                <p className="text-sm text-on-surface-variant">Пользователи не найдены</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u: any) => (
                  <div
                    key={u.uid}
                    className="flex items-center justify-between gap-3 rounded-3xl border border-outline-variant/60 bg-surface-low p-3 md:p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-11 w-11 rounded-2xl md:h-12 md:w-12">
                        <AvatarImage src={u.photoURL} className="object-cover" />
                        <AvatarFallback className="rounded-2xl bg-primary-container font-bold text-primary-on-container">
                          {u.displayName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-bold text-on-surface md:text-base">
                          {u.displayName}
                          {u.isBanned && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-bold uppercase text-destructive">
                              ban
                            </span>
                          )}
                        </p>
                        <p className="truncate font-mono text-[11px] text-on-surface-variant">
                          {u.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-2xl border-outline-variant"
                        aria-label="Установить ПИН"
                        onClick={() => {
                          setSelectedUser(u);
                          setPinDialogOpen(true);
                        }}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      {u.uid !== user?.uid && (
                        <Button
                          variant={u.isBanned ? 'outline' : 'destructive'}
                          className="h-10 gap-2 rounded-2xl px-3 text-xs"
                          onClick={() => handleBan(u.uid, u.isBanned)}
                        >
                          {u.isBanned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          <span className="hidden sm:inline">{u.isBanned ? 'Разбанить' : 'Забанить'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent className="max-w-[92vw] rounded-[28px] border-none bg-surface-container p-6 shadow-m3-strong sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Key className="h-5 w-5 text-primary" /> ПИН-код доступа
              </DialogTitle>
              <DialogDescription className="text-xs text-on-surface-variant">
                Секретный код для восстановления доступа пользователя{' '}
                <b>{selectedUser?.displayName}</b>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Введите ПИН…"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="m3-field font-mono text-center tracking-[0.4em]"
              />
            </div>
            <DialogFooter>
              <Button
                className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground"
                onClick={handleSetPin}
              >
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
