
import { useState, useEffect } from "react";
import { Trash2, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";

interface HistoryItem {
  id: number;
  timestamp: string;
  query: string;
  optimizedQuery: string;
  analysis: string;
}

interface OptimizationHistoryProps {
  setActiveTab: (tab: string) => void;
}

const OptimizationHistory = ({ setActiveTab }: OptimizationHistoryProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedHistory = localStorage.getItem("queryHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("queryHistory");
    setHistory([]);
    toast({
      title: "History Cleared",
      description: "Your optimization history has been cleared",
    });
  };

  const deleteHistoryItem = (id: number) => {
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem("queryHistory", JSON.stringify(newHistory));
    setHistory(newHistory);
    toast({
      title: "Item Deleted",
      description: "The history item has been removed",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const truncateQuery = (query: string, maxLength = 50) => {
    return query.length > maxLength ? query.substring(0, maxLength) + "..." : query;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-800">Optimization History</h2>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
              Clear History
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your entire optimization history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearHistory} className="bg-red-500 hover:bg-red-600">
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-blue-100 p-3 mb-4">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-lg">No History Yet</h3>
            <p className="text-gray-500 mt-2 mb-6 text-center max-w-md">
              Your optimization history will appear here after you optimize queries
            </p>
            <Button onClick={() => setActiveTab("optimizer")}>
              Optimize a Query
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Recent Optimizations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y">
                    {history.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {truncateQuery(item.query)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(item.timestamp)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryItem(item.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedItem ? (
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Original Query</h3>
                    <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap break-words">
                      {selectedItem.query}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-2">Optimized Query</h3>
                    <div className="bg-blue-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap break-words">
                      {selectedItem.optimizedQuery}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-2">Analysis</h3>
                    <div className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap break-words">
                      {selectedItem.analysis}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setActiveTab("optimizer");
                      // You could implement re-loading the selected query into the optimizer here
                    }}
                  >
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Optimize Again
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-500">
                    Select an item from history to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Temporarily adding this for OptimizationHistory.tsx since it's not imported
function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default OptimizationHistory;
