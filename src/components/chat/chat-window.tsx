
"use client";

import * as React from "react";
import { Phone, Video, Info, Send, Paperclip, Smile, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const DUMMY_MESSAGES = [
  { id: "1", sender: "Oakley Smith", content: "Hey! Have you been to the new community garden?", time: "9:00 AM", isMe: false },
  { id: "2", sender: "Me", content: "Not yet! I heard they have some rare fern species there.", time: "9:05 AM", isMe: true },
  { id: "3", sender: "Oakley Smith", content: "They do! Look at this one I found today.", time: "9:10 AM", isMe: false },
  { id: "4", sender: "Oakley Smith", content: "https://picsum.photos/seed/landscape/600/400", time: "9:10 AM", isMe: false, type: "image" },
  { id: "5", sender: "Me", content: "That looks amazing! We should go together next weekend.", time: "9:15 AM", isMe: true },
];

export function ChatWindow({ chatId }: { chatId: string }) {
  const [message, setMessage] = React.useState("");

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={`https://picsum.photos/seed/user${chatId}/200/200`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-sm">Oakley Smith</h2>
            <p className="text-[10px] text-green-500 font-medium">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
          {DUMMY_MESSAGES.map((msg) => (
            <div key={msg.id} className={cn(
              "flex flex-col max-w-[80%]",
              msg.isMe ? "ml-auto items-end" : "mr-auto items-start"
            )}>
              {msg.type === "image" ? (
                <div className="rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                  <img src={msg.content} alt="Shared" className="max-w-full h-auto" />
                </div>
              ) : (
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                  msg.isMe 
                    ? "bg-accent text-white rounded-tr-none" 
                    : "bg-white text-foreground rounded-tl-none border border-primary/10"
                )}>
                  {msg.content}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-white/50 backdrop-blur-md border-t">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
              <ImageIcon className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 relative">
            <Input 
              placeholder="Type a message..." 
              className="pr-10 bg-background border-none rounded-full focus-visible:ring-primary shadow-inner"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setMessage("");
                }
              }}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:text-accent"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </div>
          <Button 
            className="rounded-full bg-accent hover:bg-accent/90 shadow-md text-white px-6"
            onClick={() => setMessage("")}
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
