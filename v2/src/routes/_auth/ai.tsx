import { createFileRoute } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { api } from "~convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, TrendingUp, PiggyBank, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/ai")({
  component: AIPage,
});

function AIPage() {
  const analyze = useAction(api.ai.analyze);
  const forecast = useAction(api.ai.forecast);
  const budgetAdvice = useAction(api.ai.budgetAdvice);
  const ask = useAction(api.ai.ask);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [question, setQuestion] = useState("");

  const runAction = async (
    actionFn: () => Promise<{ analysis?: string; forecast?: string; advice?: string; answer?: string }>,
  ) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await actionFn();
      setResult(
        res.analysis ?? res.forecast ?? res.advice ?? res.answer ?? "No response",
      );
    } catch (e) {
      toast.error(
        "AI request failed. Make sure Ollama is running and accessible.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Insights</h1>

      <Tabs defaultValue="analyze">
        <TabsList>
          <TabsTrigger value="analyze" className="gap-2">
            <Bot className="h-4 w-4" />
            Analyze
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-2">
            <PiggyBank className="h-4 w-4" />
            Budget Advice
          </TabsTrigger>
          <TabsTrigger value="ask" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Ask
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze">
          <Card>
            <CardHeader>
              <CardTitle>Financial Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get a comprehensive analysis of your spending patterns, financial
                health, and actionable recommendations.
              </p>
              <Button
                onClick={() => runAction(() => analyze({ months: 3 }))}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Run Analysis"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>Spending Forecast</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Project your spending, income, and net worth for the next 3
                months based on recent trends.
              </p>
              <Button
                onClick={() =>
                  runAction(() =>
                    forecast({ months: 3, forecastMonths: 3 }),
                  )
                }
                disabled={loading}
              >
                {loading ? "Forecasting..." : "Generate Forecast"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle>Budget Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get AI-suggested budget allocations using the envelope/zero-based
                budgeting method.
              </p>
              <Button
                onClick={() => runAction(() => budgetAdvice({ months: 3 }))}
                disabled={loading}
              >
                {loading ? "Calculating..." : "Get Budget Advice"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ask">
          <Card>
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ask any question about your finances and get an AI-powered
                answer.
              </p>
              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., How can I save more on groceries?"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && question.trim()) {
                      runAction(() => ask({ question, months: 3 }));
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (question.trim()) {
                      runAction(() => ask({ question, months: 3 }));
                    }
                  }}
                  disabled={loading || !question.trim()}
                >
                  {loading ? "Thinking..." : "Ask"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Result display */}
      {loading && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {result}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
