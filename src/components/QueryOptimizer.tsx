
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeEditor from "@/components/CodeEditor";
import OptimizationResult from "@/components/OptimizationResult";
import { optimizeQuery } from "@/lib/api";

const formSchema = z.object({
  sqlQuery: z.string().min(1, "Query is required"),
  tableStructure: z.string(),
  existingIndexes: z.string(),
  performanceIssue: z.string(),
  explainResults: z.string(),
  serverInfo: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const QueryOptimizer = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sqlQuery: "",
      tableStructure: "",
      existingIndexes: "",
      performanceIssue: "",
      explainResults: "",
      serverInfo: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsOptimizing(true);
    try {
      const optimizationResult = await optimizeQuery(data);
      setResult(optimizationResult);
      
      // Save to history
      const history = JSON.parse(localStorage.getItem("queryHistory") || "[]");
      const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        query: data.sqlQuery,
        optimizedQuery: optimizationResult.optimizedQuery,
        analysis: optimizationResult.analysis,
      };
      localStorage.setItem("queryHistory", JSON.stringify([historyItem, ...history]));
      
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize the query. Please try again.",
        variant: "destructive",
      });
      console.error("Optimization error:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="sqlQuery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">MySQL Query</FormLabel>
                      <FormDescription>
                        Enter the MySQL query you want to optimize
                      </FormDescription>
                      <FormControl>
                        <CodeEditor
                          value={field.value}
                          onChange={field.onChange}
                          language="sql"
                          placeholder="SELECT * FROM users WHERE status = 'active'"
                          height="200px"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Tabs defaultValue="tableStructure">
                  <TabsList className="w-full bg-blue-50 grid grid-cols-3">
                    <TabsTrigger value="tableStructure">Table Structure</TabsTrigger>
                    <TabsTrigger value="indexesIssues">Indexes & Issues</TabsTrigger>
                    <TabsTrigger value="explainServer">EXPLAIN & Server</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tableStructure" className="pt-4">
                    <FormField
                      control={form.control}
                      name="tableStructure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Table Structure and Record Counts</FormLabel>
                          <FormDescription>
                            Describe the structure of involved tables and their record counts
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              placeholder="users: id (INT), name (VARCHAR), email (VARCHAR), status (ENUM), created_at (TIMESTAMP) - ~1M records"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="indexesIssues" className="pt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="existingIndexes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Existing Indexes</FormLabel>
                          <FormDescription>
                            List all existing indexes on the tables
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              placeholder="PRIMARY KEY (id), INDEX idx_status (status), INDEX idx_created_at (created_at)"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="performanceIssue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Performance Issues</FormLabel>
                          <FormDescription>
                            Describe the performance issues you're experiencing
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              placeholder="Query takes over 10 seconds to execute, timeouts during peak hours"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="explainServer" className="pt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="explainResults"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EXPLAIN Results</FormLabel>
                          <FormDescription>
                            Paste the results of running EXPLAIN on your query
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              placeholder="id | select_type | table | type | possible_keys | key | key_len | ref | rows | Extra"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="serverInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Server Information</FormLabel>
                          <FormDescription>
                            Provide details about your database server
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              placeholder="MySQL 8.0, 16GB RAM, 8 CPU cores, 5M total records in database"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={isOptimizing}
                  className="bg-blue-600 hover:bg-blue-700 w-full max-w-md"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Optimizing Query...
                    </>
                  ) : (
                    "Optimize My Query"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {result && <OptimizationResult result={result} />}
    </div>
  );
};

export default QueryOptimizer;
