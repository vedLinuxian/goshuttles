import { Card } from "@/components/ui";
import { Star } from "lucide-react";

export default function ReviewsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-400" />
          Trip Reviews &amp; Ratings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Rate your driver, vehicle cleanliness, and overall shuttle experience.
        </p>
      </div>

      <Card variant="glass" className="p-12 text-center space-y-3 border-slate-800">
        <Star className="h-12 w-12 mx-auto text-amber-500/40" />
        <p className="text-lg font-extrabold text-white">Shuttle Experience Reviews</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Submit ratings and feedback after completing your shuttle journey to help us maintain top fleet quality.
        </p>
      </Card>
    </div>
  );
}
