import { useState, useCallback } from "react";
import { getRecommendation as fetchRecommendation } from "@/lib/anthropic";
import { useUserPrograms } from "@/hooks/usePrograms";
import type { RecommendationResult } from "@/types";

interface UseRecommendationReturn {
  loading: boolean;
  result: RecommendationResult | null;
  error: string | null;
  getRecommendation: (
    merchantId: string,
    amountAed: number,
    category?: string
  ) => Promise<void>;
  reset: () => void;
}

export function useRecommendation(): UseRecommendationReturn {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: userPrograms = [] } = useUserPrograms();

  const getRecommendation = useCallback(
    async (merchantId: string, amountAed: number, category?: string) => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const userProgramIds = userPrograms.map((up) => up.id);

        if (userProgramIds.length === 0) {
          setError("Please enroll in at least one loyalty program first.");
          return;
        }

        const recommendation = await fetchRecommendation({
          merchantId,
          amountAed,
          category,
          userProgramIds,
        });

        setResult(recommendation);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to get recommendation";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [userPrograms]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { loading, result, error, getRecommendation, reset };
}
