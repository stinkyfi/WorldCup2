import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function App() {
  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Card className="max-w-lg border-border">
          <CardHeader>
            <CardTitle className="font-mono text-xl">Broadcast shell</CardTitle>
            <CardDescription>
              Connect on <span className="font-mono text-primary">Base Sepolia</span> via RainbowKit. Tokens:
              background <span className="font-mono">#0A0E1A</span>, surface <span className="font-mono">#131929</span>,
              primary <span className="font-mono">#3B82F6</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input type="text" placeholder="Sample input (shadcn-style)" aria-label="Demo input" />
            <div className="flex flex-wrap gap-2">
              <Button type="button">Primary</Button>
              <Button type="button" variant="secondary">
                Secondary
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
