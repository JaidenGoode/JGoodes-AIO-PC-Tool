import { Link } from "wouter";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5">
      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
        <AlertCircle className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h1 className="text-4xl font-black text-foreground tracking-tight">404</h1>
        <p className="text-sm text-muted-foreground mt-2">Page not found</p>
      </div>
      <Link href="/">
        <Button className="bg-primary text-white h-8 text-sm">
          <Home className="mr-2 h-3.5 w-3.5" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
