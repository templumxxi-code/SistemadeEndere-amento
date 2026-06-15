import { createFileRoute } from "@tanstack/react-router";
import { SceWorkspace } from "@/components/sce-workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCE — Endereçamento de Estoque" },
      { name: "description", content: "Planeje o layout do armazém, calibre plantas e organize endereços de estoque." },
      { property: "og:title", content: "SCE — Endereçamento de Estoque" },
      { property: "og:description", content: "Planeje layouts e endereços de estoque com precisão." },
    ],
  }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return <SceWorkspace />;
}
