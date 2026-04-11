
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
  const avatarRef = useMemoFirebase(() => (db ? doc(db, "avatars", userId) : null), [db, userId]);
  const { data: avatarData, loading } = useDoc(avatarRef);

  return (
    <Avatar className={className}>
      {avatarData?.base64 && <AvatarImage src={avatarData.base64} />}
      <AvatarFallback>
        {fallback ? fallback[0].toUpperCase() : <User className="w-4 h-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
