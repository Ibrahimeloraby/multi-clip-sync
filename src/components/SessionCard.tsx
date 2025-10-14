import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, Video } from "lucide-react";
import { Link } from "react-router-dom";

interface SessionCardProps {
  id: string;
  name: string;
  code: string;
  participants: number;
  videosCount: number;
  duration: string;
  tier: "free" | "pro" | "enterprise";
}

const SessionCard = ({ id, name, code, participants, videosCount, duration, tier }: SessionCardProps) => {
  const tierColors = {
    free: "text-muted-foreground",
    pro: "text-secondary",
    enterprise: "text-primary"
  };

  return (
    <Card className="glass-card hover-lift p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground">Code: {code}</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full bg-muted ${tierColors[tier]}`}>
          {tier.toUpperCase()}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <Users className="w-4 h-4 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{participants}</p>
          <p className="text-xs text-muted-foreground">Users</p>
        </div>
        <div className="space-y-1">
          <Video className="w-4 h-4 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{videosCount}</p>
          <p className="text-xs text-muted-foreground">Videos</p>
        </div>
        <div className="space-y-1">
          <Clock className="w-4 h-4 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{duration}</p>
          <p className="text-xs text-muted-foreground">Max</p>
        </div>
      </div>
      
      <Link to={`/session/${id}`}>
        <Button variant="secondary" className="w-full">
          Open Session
        </Button>
      </Link>
    </Card>
  );
};

export default SessionCard;
