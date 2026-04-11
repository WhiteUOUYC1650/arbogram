
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { User } from "lucide-react";

interface UserAvatarProps {
  userId: string;
  fallback?: string;
  className?: string;
}

export function UserAvatar({ userId, fallback, className }: UserAvatarProps) {
  const db = useFirestore();
  // Мемоизируем ссылку на документ аватара
  const avatarRef = useMemoFirebase(() => (db && userId ? doc(db, "avatars", userId) : null), [db, userId]);
  const { data: avatarData } = useDoc(avatarRef);

  return (
    <Avatar className={className}>
      {avatarData?.base64 && <AvatarImage src={avatarData.base64} className="object-cover" />}
      <AvatarFallback className="bg-accent/10 text-accent font-bold">
        {fallback ? fallback[0].toUpperCase() : <User className="w-4 h-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
