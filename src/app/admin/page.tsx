
"use client";

import { useFirestore, useUser, useDoc, useCollection } from "@/firebase";
import { AuthGuard } from "@/components/auth-guard";
import { doc, updateDoc, collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldAlert, Ban, UserCheck, Loader2, Key } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  if (authLoading || userRef.loading || (!isAdmin && userUsername !== "")) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="h-screen bg-background overflow-hidden flex flex-col">
        <div className="max-w-4xl w-full mx-auto p-6 space-y-6 flex flex-col h-full">
          <div className="flex items-center gap-4 shrink-0">
            <div className="p-3 rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Admin Terminal</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Управление пользователями CoveChat v1.1.2.1</p>
            </div>
          </div>

          <ScrollArea className="flex-1 border rounded-[2rem] bg-card/50 shadow-inner overflow-hidden">
            <div className="p-4 space-y-3">
              {usersLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin opacity-20" /></div>
              ) : allUsers?.map((u: any) => (
                <div key={u.uid} className="flex items-center justify-between p-3 md:p-4 bg-card rounded-2xl border shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <Avatar className="w-10 h-10 md:w-12 md:h-12 border-2 border-primary/10">
                      <AvatarImage src={u.photoURL} className="object-cover" />
                      <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-sm md:text-base truncate">{u.displayName}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground font-mono truncate">{u.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="rounded-xl h-9 w-9 md:h-10 md:w-10"
                      onClick={() => { setSelectedUser(u); setPinDialogOpen(true); }}
                    >
                      <Key className="w-4 h-4" />
                    </Button>
                    {u.uid !== user?.uid && (
                      <Button 
                        variant={u.isBanned ? "outline" : "destructive"} 
                        className="rounded-xl gap-2 h-9 md:h-10 text-xs px-3"
                        onClick={() => handleBan(u.uid, u.isBanned)}
                      >
                        {u.isBanned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        <span className="hidden sm:inline">{u.isBanned ? "Разбанить" : "Забанить"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-sm">
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
