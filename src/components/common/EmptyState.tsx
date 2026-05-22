import React from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-12 px-6">
      {icon && (
        <div className="text-slate-300 [&>svg]:w-12 [&>svg]:h-12">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-xs">
        <h3 className="text-slate-700 font-semibold text-base">{title}</h3>
        {description && (
          <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} variant="default" size="sm" className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
