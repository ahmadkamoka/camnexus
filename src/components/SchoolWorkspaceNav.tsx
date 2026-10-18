import { Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SchoolWorkspaceNav() {
  return <nav aria-label="School workspace" className="flex flex-wrap gap-2 border-b pb-4">
    <Button variant="outline" asChild><Link to="/assess" activeProps={{ className: "bg-secondary text-secondary-foreground" }}><ClipboardList />Needs Assessment</Link></Button>
  </nav>;
}