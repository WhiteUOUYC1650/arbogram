
import { TreePine } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-700">
      <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
        <TreePine className="w-12 h-12 text-accent" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold font-headline text-foreground">Welcome to Arbogram</h2>
        <p className="text-muted-foreground max-w-sm">
          Select a conversation from the sidebar to start growing your community.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8">
        <div className="p-4 rounded-2xl bg-white/40 border border-primary/10 text-left space-y-2">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-xs font-bold text-accent">G</span>
          </div>
          <p className="text-sm font-semibold">Join Groups</p>
          <p className="text-[10px] text-muted-foreground">Find local gardening and nature groups.</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/40 border border-primary/10 text-left space-y-2">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-xs font-bold text-accent">S</span>
          </div>
          <p className="text-sm font-semibold">Secure Messaging</p>
          <p className="text-[10px] text-muted-foreground">Your messages are safe in the forest.</p>
        </div>
      </div>
    </div>
  );
}
