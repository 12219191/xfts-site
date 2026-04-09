import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog - XFTS Inteligência Analítica" },
      { name: "description", content: "Artigos sobre gestão, tecnologia e inteligência analítica." },
    ],
  }),
  component: () => <Outlet />,
});
