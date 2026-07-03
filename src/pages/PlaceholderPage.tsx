import { Plus, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  ctaLabel?: string;
}

export default function PlaceholderPage({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  ctaLabel = "Novo registro",
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            {ctaLabel}
          </Button>
        }
      />
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            {ctaLabel}
          </Button>
        }
      />
    </div>
  );
}
