
"use client";

import { useFirestore, useUser, useDoc, useCollection } from "@/firebase";
import { AuthGuard } from "@/components/auth-guard";
import { doc, updateDoc, collection, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldAlert, Ban, UserCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useDoc(user ? doc(db!, "users", user.uid) : null);
  const isAdmin = userRef.data?.username === "@nexus90kyt" || userRef.data?.username === "@white";

  const usersQuery = collection(db!, "users");
  const { data: allUsers, loading: usersLoading } = useCollection(usersQuery);

  useEffect(() => {
    if (!authLoading && !userRef.loading && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, userRef.loading, authLoading, router]);

  const handleBan = async (targetUid: string, isBanned: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", targetUid), { isBanned: !isBanned });
      toast({ title: isBanned ? "Разбанен" : "Забанен", variant: isBanned ? "default" : "destructive" });
    } catch (e) {
      toast({ title: "Ошибка прав", variant: "destructive" });
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
              <p className="text-muted-foreground">Управление пользователями CoveChat v1.1.1</p>
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
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
