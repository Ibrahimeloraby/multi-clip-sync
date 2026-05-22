import { cn } from "@/lib/utils";

interface ProgramLogoProps {
  program: {
    slug: string;
    display_name_en: string;
    logo_url: string | null;
    category: string;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const CATEGORY_BG: Record<string, string> = {
  airline: "bg-sky-500",
  hotel: "bg-purple-500",
  bank: "bg-emerald-500",
  retail: "bg-orange-500",
  telco: "bg-pink-500",
  gov: "bg-slate-500",
  fitness: "bg-green-500",
  entertainment: "bg-yellow-500",
};

const SIZE_CLASSES: Record<NonNullable<ProgramLogoProps["size"]>, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-base",
};

const SIZE_PX: Record<NonNullable<ProgramLogoProps["size"]>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

export default function ProgramLogo({ program, size = "md", className }: ProgramLogoProps) {
  const sizeClass = SIZE_CLASSES[size];
  const px = SIZE_PX[size];
  const bgColor = CATEGORY_BG[program.category] ?? "bg-slate-400";

  const initials = program.display_name_en
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (program.logo_url) {
    return (
      <img
        src={program.logo_url}
        alt={program.display_name_en}
        width={px}
        height={px}
        className={cn("rounded-full object-cover flex-shrink-0", sizeClass, className)}
        onError={(e) => {
          // Fall back to initials on image load failure
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<span>${initials}</span>`;
            parent.className = cn(
              "rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white",
              sizeClass,
              bgColor,
              className
            );
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white",
        sizeClass,
        bgColor,
        className
      )}
      aria-label={program.display_name_en}
    >
      {initials}
    </div>
  );
}
