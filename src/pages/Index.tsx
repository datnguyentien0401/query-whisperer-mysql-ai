
import { useState } from "react";
import QueryOptimizer from "@/components/QueryOptimizer";
import OptimizationHistory from "@/components/OptimizationHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const Index = () => {
  const [activeTab, setActiveTab] = useState("optimizer");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-700">MySQL Query Whisperer</h1>
                <p className="text-sm text-gray-500">AI-powered MySQL query optimization</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs
          defaultValue="optimizer"
          className="w-full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <div className="flex justify-center mb-6">
            <TabsList className="bg-blue-50">
              <TabsTrigger 
                value="optimizer"
                className={cn(
                  "data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                )}
              >
                Query Optimizer
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className={cn(
                  "data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                )}
              >
                Optimization History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="optimizer" className="mt-0">
            <QueryOptimizer />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <OptimizationHistory setActiveTab={setActiveTab} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-gray-50 border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} MySQL Query Whisperer - AI-powered query optimization
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
