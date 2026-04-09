
import Link from "next/link";
import { TreePine, ArrowRight, ShieldCheck, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
            <TreePine className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold font-headline text-accent tracking-tight">Arbogram</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/chat">
            <Button variant="ghost" className="text-muted-foreground">Log In</Button>
          </Link>
          <Link href="/chat">
            <Button className="bg-accent hover:bg-accent/90 text-white rounded-full px-6">Join the Forest</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 max-w-4xl mx-auto space-y-8">
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-accent text-xs font-semibold mb-4">
            <Sparkles className="w-3 h-3" />
            <span>Connecting Nature Lovers Everywhere</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold font-headline tracking-tight text-foreground leading-[1.1]">
            Grow Your <span className="text-accent">Conversations</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Arbogram is the minimalist, secure space for one-on-one chats and group communities focused on what matters most.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in duration-1000 delay-300">
          <Link href="/chat">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-white text-lg px-10 py-7 rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center gap-2">
              Start Chatting <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-lg px-10 py-7 rounded-2xl border-2 border-primary/20 bg-white/40 backdrop-blur-sm">
            Explore Themes
          </Button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-24">
          <div className="p-8 rounded-3xl bg-white/40 border border-primary/10 space-y-4 hover:shadow-lg transition-all text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold">Secure Delivery</h3>
            <p className="text-sm text-muted-foreground">Reliable message encryption and delivery confirmation for peace of mind.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white/40 border border-primary/10 space-y-4 hover:shadow-lg transition-all text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold">Media Sharing</h3>
            <p className="text-sm text-muted-foreground">Seamlessly share high-quality photos and videos of your latest botanical finds.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white/40 border border-primary/10 space-y-4 hover:shadow-lg transition-all text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold">Custom Themes</h3>
            <p className="text-sm text-muted-foreground">Personalize your chat experience with earthy, calming color palettes.</p>
          </div>
        </div>
      </main>

      <footer className="p-12 text-center text-muted-foreground text-sm">
        <p>© 2024 Arbogram. Cultivating better communication.</p>
      </footer>
    </div>
  );
}
