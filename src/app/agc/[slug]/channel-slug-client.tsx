
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Loader2, MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Клиентская логика поиска канала по слагу.
 */
export default function ChannelSlugClient({ slug }: { slug: string }) {
  const db = useFirestore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function resolveSlug() {
      if (!db || !slug) return;
      
      try {
        const q = query(
          collection(db, "chats"), 
          where("slug", "==", slug),
          where("type", "==", "channel"),
          limit(1)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          router.replace(`/chat/${snap.docs[0].id}`);
        } else {
          setError(true);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("Slug resolution error:", e);
        setError(true);
        setLoading(false);
      }
    }

    resolveSlug();
  }, [db, slug, router]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Поиск канала agc/{slug}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-6 p-4 text-center bg-background">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <MessageSquareOff className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Канал не найден</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Ссылка agc/{slug} не существует или была удалена.
          </p>
        </div>
        <Button asChild className="rounded-xl bg-accent">
          <Link href="/chat">Вернуться в Arbogram</Link>
        </Button>
      </div>
    );
  }

  return null;
}
