
"use client";

import { useFirestore, useUser, useDoc, useCollection } from "@/firebase";
import { AuthGuard } from "@/components/auth-guard";
import { doc, updateDoc, collection, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldAlert, Ban, UserCheck, Loader2, Key } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AdminPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useDoc(user ? doc(db!, "users", user.uid) : null);
  const userUsername = userRef.data?.username?.toLowerCase() || "";
  const isAdmin = userUsername === "@nexus90kyt" || userUsername === "@white";

  const usersQuery = collection(db!, "users");
  const { data: allUsers, loading: usersLoading } = useCollection(usersQuery);

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    if (!authLoading && !userRef.loading && !isAdmin && userUsername !== "") {
      router.push("/");
    }
  }, [isAdmin, userRef.loading, authLoading, router, userUsername]);

  const handleBan = async (targetUid: string, isBanned: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", targetUid), { isBanned: !isBanned });
      toast({ title: isBanned ? "Разбанен" : "Забанен", variant: isBanned ? "default" : "destructive" });
    } catch (e) {
      toast({ title: "Ошибка прав", variant: "destructive" });
    }
  };

  const handleSetPin = async () => {
    if (!db || !selectedUser) return;
    try {
      await updateDoc(doc(db, "users", selectedUser.uid), { secretPin: newPin });
      toast({ title: "ПИН-код обновлен" });
      setPinDialogOpen(false);
      setNewPin("");
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  if (authLoading || userRef.loading || !isAdmin) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Terminal</h1>
              <p className="text-muted-foreground">Управление пользователями CoveChat v1.1.2</p>
            </div>
          </div>

          <div className="grid gap-4">
            {allUsers?.map((u: any) => (
              <div key={u.uid} className="flex items-center justify-between p-4 bg-card rounded-2xl border shadow-sm">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={u.photoURL} />
                    <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{u.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="rounded-xl"
                    onClick={() => { setSelectedUser(u); setPinDialogOpen(true); }}
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                  {u.uid !== user?.uid && (
                    <Button 
                      variant={u.isBanned ? "outline" : "destructive"} 
                      className="rounded-xl gap-2"
                      onClick={() => handleBan(u.uid, u.isBanned)}
                    >
                      {u.isBanned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      {u.isBanned ? "Разбанить" : "Забанить"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Установить ПИН-код</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Установите секретный код для пользователя <b>{selectedUser?.displayName}</b></p>
            <Input 
              placeholder="Введите ПИН..." 
              value={newPin} 
              onChange={(e) => setNewPin(e.target.value)} 
              className="rounded-xl h-12"
            />
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-2xl cove-gradient text-white font-bold" onClick={handleSetPin}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
