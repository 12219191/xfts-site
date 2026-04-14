import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FeatureGateProps {
  hasAccess: boolean;
  requiredPlan: "PRO" | "ENTERPRISE";
  children: React.ReactNode;
  className?: string;
}

export function FeatureGate({ hasAccess, requiredPlan, children, className = "" }: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  const planColors = requiredPlan === "PRO"
    ? { badge: "bg-cta/10 text-cta", border: "border-cta/20" }
    : { badge: "bg-amber-500/10 text-amber-600", border: "border-amber-500/20" };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative cursor-not-allowed ${className}`}>
            {/* Blurred content */}
            <div className="pointer-events-none select-none blur-[3px] opacity-50">
              {children}
            </div>

            {/* Lock overlay */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-dashed ${planColors.border} bg-card/80 backdrop-blur-[1px]`}>
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${planColors.badge}`}>
                  <Lock className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${planColors.badge}`}>
                  {requiredPlan}
                </span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Disponível no plano {requiredPlan}. Faça upgrade para desbloquear.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
