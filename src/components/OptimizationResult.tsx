
import { useState } from "react";
import { Check, Copy, Clock, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import CodeEditor from "./CodeEditor";
import FeedbackButtons from "./FeedbackButtons";

interface OptimizationResultProps {
  result: {
    originalQuery: string;
    optimizedQuery: string;
    analysis: string;
    performanceImprovement: string;
    indexSuggestions: string[];
    structureSuggestions: string[];
    serverSuggestions: string[];
    id: number;
    source?: 'openai' | 'history';
  };
}

const OptimizationResult = ({ result }: OptimizationResultProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Query has been copied to your clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-blue-800">Optimization Results</h2>
          {result.source === 'history' && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
              <History className="h-3 w-3" />
              From History
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {result.performanceImprovement}
          </Badge>
          <FeedbackButtons optimizationId={result.id} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <Tabs defaultValue="optimized">
          <div className="bg-blue-50 p-1">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="optimized">Optimized Query</TabsTrigger>
              <TabsTrigger value="original">Original Query</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="optimized" className="m-0">
            <div className="relative">
              <CodeEditor
                value={result.optimizedQuery}
                onChange={() => {}}
                language="sql"
                height="auto"
                className="min-h-[150px] border-0"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={() => copyToClipboard(result.optimizedQuery)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="original" className="m-0">
            <div className="relative">
              <CodeEditor
                value={result.originalQuery}
                onChange={() => {}}
                language="sql"
                height="auto"
                className="min-h-[150px] border-0"
              />
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">
              {result.analysis}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {result.indexSuggestions.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Suggested Indexes</h3>
                <ul className="space-y-2">
                  {result.indexSuggestions.map((suggestion, index) => (
                    <li key={index} className="bg-blue-50 p-3 rounded-md text-gray-700">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.structureSuggestions.length > 0 && (
              <div>
                <Separator className="my-4" />
                <h3 className="font-semibold text-lg mb-2">Table Structure Improvements</h3>
                <ul className="space-y-2">
                  {result.structureSuggestions.map((suggestion, index) => (
                    <li key={index} className="bg-green-50 p-3 rounded-md text-gray-700">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.serverSuggestions.length > 0 && (
              <div>
                <Separator className="my-4" />
                <h3 className="font-semibold text-lg mb-2">Server Optimizations</h3>
                <ul className="space-y-2">
                  {result.serverSuggestions.map((suggestion, index) => (
                    <li key={index} className="bg-amber-50 p-3 rounded-md text-gray-700">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptimizationResult;
