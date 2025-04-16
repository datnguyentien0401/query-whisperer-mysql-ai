
import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { submitFeedback } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface FeedbackButtonsProps {
  optimizationId: number;
  initialFeedback?: 'helpful' | 'not_helpful' | null;
}

const FeedbackButtons = ({ optimizationId, initialFeedback }: FeedbackButtonsProps) => {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(initialFeedback || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFeedback = async (value: 'helpful' | 'not_helpful') => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await submitFeedback(optimizationId, value);
      setFeedback(value);
      
      toast({
        title: "Thank you for your feedback!",
        description: "Your input helps us improve optimization results",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feedback submission failed",
        description: "Please try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground mr-1">Was this helpful?</span>
      
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`${feedback === 'helpful' ? 'bg-green-100 text-green-700 border-green-300' : ''}`}
            onClick={() => handleFeedback('helpful')}
            disabled={isSubmitting}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto p-2">
          <span className="text-sm">This optimization was helpful</span>
        </HoverCardContent>
      </HoverCard>
      
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`${feedback === 'not_helpful' ? 'bg-red-100 text-red-700 border-red-300' : ''}`}
            onClick={() => handleFeedback('not_helpful')}
            disabled={isSubmitting}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto p-2">
          <span className="text-sm">This optimization was not helpful</span>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};

export default FeedbackButtons;
