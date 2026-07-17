import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useEarnTasks, useMyCompletions, useCompleteTask } from "@/hooks/useEarnTasks";
import { useMyPassport } from "@/hooks/useFanProfile";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

const TASK_COLORS: Record<string, string> = {
  survey: "#00D4FF",
  fan_pulse: "#00FF87",
  brand_pick: "#FF8C00",
  watch_earn: "#FF6B35",
  fan_proof: "#C084FC",
  claim_city: "#F59E0B",
  refer_earn: "#EC4899",
  prediction: "#3B82F6",
  community_post: "#10B981",
};

const TASK_EMOJIS: Record<string, string> = {
  survey: "📋",
  fan_pulse: "⚡",
  brand_pick: "🏷️",
  watch_earn: "🎬",
  fan_proof: "📸",
  claim_city: "🏙️",
  refer_earn: "👥",
  prediction: "🎯",
  community_post: "💬",
};

export default function Earn() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));

  const { data: tasks } = useEarnTasks();
  const { data: completedIds } = useMyCompletions(userId);
  const { data: passport } = useMyPassport(userId);
  const completeTask = useCompleteTask();

  const handleComplete = async (task: any) => {
    if (!userId) return navigate("/auth");
    await completeTask.mutateAsync({
      taskId: task.id,
      fanId: userId,
      coinsReward: task.coins_reward,
      responseData: selectedAnswer ? { answer: selectedAnswer } : undefined,
    });
    setExpandedTask(null);
    setSelectedAnswer(null);
  };

  return (
    <AppShell coinBalance={passport?.fan_coins_balance ?? 0}>
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black text-white mb-1">Earn FanCoins</h1>
        <p className="text-white/40 text-sm">Complete tasks, build your value, cash out</p>

        {/* Today's summary */}
        <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-white/40">Available today</p>
            <p className="text-2xl font-black text-[#00FF87]">
              {tasks?.reduce((sum, t) => sum + t.coins_reward, 0).toLocaleString() ?? 0} FC
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Completed</p>
            <p className="text-2xl font-black text-white">
              {completedIds?.length ?? 0}/{tasks?.length ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-6">
        {tasks?.map((task) => {
          const completed = completedIds?.includes(task.id);
          const expanded = expandedTask === task.id;
          const color = TASK_COLORS[task.task_type] ?? "#00FF87";
          const emoji = TASK_EMOJIS[task.task_type] ?? "⭐";
          const options = (task.payload as any)?.options as string[] | undefined;

          return (
            <div
              key={task.id}
              className={cn(
                "rounded-2xl border transition-all overflow-hidden",
                completed ? "border-white/10 bg-white/3 opacity-60" : "border-white/10 bg-white/5"
              )}
            >
              <button
                onClick={() => !completed && setExpandedTask(expanded ? null : task.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${color}20` }}
                >
                  {completed ? <CheckCircle size={20} style={{ color }} /> : emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: `${color}20`, color }}
                    >
                      {task.task_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color }}>+{task.coins_reward} FC</p>
                  {!completed && (
                    expanded ? <ChevronUp size={14} className="text-white/30 mt-1 ml-auto" /> : <ChevronDown size={14} className="text-white/30 mt-1 ml-auto" />
                  )}
                </div>
              </button>

              {expanded && !completed && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-white/60 mb-3">{task.description}</p>

                  {options && (
                    <div className="space-y-2 mb-4">
                      {options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedAnswer(opt)}
                          className={cn(
                            "w-full py-2.5 px-3 rounded-xl border text-sm font-medium text-left transition-all",
                            selectedAnswer === opt
                              ? "border-[#00FF87]/60 bg-[#00FF87]/10 text-[#00FF87]"
                              : "border-white/10 text-white/60 hover:border-white/20"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleComplete(task)}
                    disabled={completeTask.isPending || (!!options && !selectedAnswer)}
                    className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-colors"
                    style={{ background: color, color: "#0A0A0F" }}
                  >
                    {completeTask.isPending ? "..." : `Claim ${task.coins_reward} FC →`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
