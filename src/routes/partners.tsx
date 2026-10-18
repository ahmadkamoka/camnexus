import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/partners")({
  component: () => <Outlet />,
});
