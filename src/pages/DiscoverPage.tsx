import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Tv, CreditCard, AlertCircle } from "lucide-react";
import MoodSelector from "@/components/mood/MoodSelector";
import ContentRecommendations from "@/components/mood/ContentRecommendations";
import PlatformConnector from "@/components/mood/PlatformConnector";
import SubscriptionManager from "@/components/mood/SubscriptionManager";
import { getRecommendations, saveMoodSession, loadUserPlatforms, loadWatchHistory } from "@/lib/moodAgentService";
import type { MoodType, MoodAgentResponse, UserPlatform, WatchHistoryEntry } from "@/agent/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const TMDB_KEY_MISSING = !import.meta.env.VITE_TMDB_API_KEY;

export default function DiscoverPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("discover");
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [recommendations, setRecommendations] = useState<MoodAgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [userPlatforms, setUserPlatforms] = useState<UserPlatform[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([]);
  const [moodDescription, setMoodDescription] = useState<string | undefined>();

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      loadUserPlatforms(user.id),
      loadWatchHistory(user.id),
    ]).then(([platforms, history]) => {
      setUserPlatforms(platforms);
      setWatchHistory(history);
    });
  }, [user?.id]);

  const handleMoodSelect = async (mood: MoodType, description?: string) => {
    setSelectedMood(mood);
    setMoodDescription(description);
    setRecommendations(null);
    setLoading(true);

    try {
      const result = await getRecommendations(
        mood,
        userPlatforms,
        watchHistory,
        description
      );
      setRecommendations(result);
      if (user?.id) {
        await saveMoodSession(user.id, mood, result, description);
      }
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg.includes("VITE_TMDB_API_KEY")
        ? "TMDB API key not set. Add VITE_TMDB_API_KEY to your .env file."
        : msg.includes("ANTHROPIC_API_KEY")
        ? "Anthropic API key not configured. Set it in Supabase secrets."
        : msg
      );
      setSelectedMood(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedMood(null);
    setRecommendations(null);
    setMoodDescription(undefined);
  };

  const handleRefresh = () => {
    if (selectedMood) handleMoodSelect(selectedMood, moodDescription);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="pt-12 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">MoodMatch</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-powered picks across all your streaming platforms
          </p>
        </div>

        {/* Setup warning */}
        {TMDB_KEY_MISSING && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4 text-sm text-yellow-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Setup required</div>
              <div className="text-xs mt-0.5">
                Add <code className="bg-yellow-500/20 px-1 rounded">VITE_TMDB_API_KEY</code> to your{" "}
                <code className="bg-yellow-500/20 px-1 rounded">.env</code> file.{" "}
                Free at{" "}
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="underline">
                  themoviedb.org
                </a>
              </div>
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="discover" className="flex-1 gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex-1 gap-1.5 text-xs">
              <Tv className="w-3.5 h-3.5" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex-1 gap-1.5 text-xs">
              <CreditCard className="w-3.5 h-3.5" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="mt-0">
            {recommendations && selectedMood ? (
              <ContentRecommendations
                mood={selectedMood}
                response={recommendations}
                watchHistory={watchHistory}
                userId={user?.id}
                onReset={handleReset}
                onRefresh={handleRefresh}
                loading={loading}
              />
            ) : (
              <MoodSelector
                selectedMood={selectedMood}
                onSelect={handleMoodSelect}
                loading={loading}
              />
            )}
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="mt-0">
            <PlatformConnector
              userId={user?.id}
              onPlatformsChange={setUserPlatforms}
            />
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="mt-0">
            <SubscriptionManager userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
