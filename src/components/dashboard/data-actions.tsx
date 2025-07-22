"use client";

import { useState } from "react";
import { generateHealthSummary } from "@/ai/flows/ai-health-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Apple, Loader2 } from "lucide-react";

export default function DataActions() {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setSummary("");
    try {
      const result = await generateHealthSummary({
        sleepData: "User averaged 7.2 hours of sleep this week, with some inconsistencies on Friday and Saturday.",
        exerciseData: "User completed 3 Pilates sessions and 2 cardio workouts.",
        heartRateData: "Resting heart rate is stable at 62 bpm.",
        menstruationData: "Currently in the follicular phase.",
        supplementData: "Daily intake of Vitamin D and Magnesium.",
        foodIntakeData: "Generally balanced diet, with higher carb intake on workout days.",
        calendarData: "Work-heavy week with two evening social events.",
      });
      setSummary(result.summary);
    } catch (error) {
      console.error("Failed to generate summary:", error);
      setSummary("Sorry, there was an error generating your health summary.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border-2 border-dashed rounded-lg text-center space-y-2">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag & drop CSV/PDF files or</p>
            <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" /> Upload Files</Button>
        </div>
        <Button variant="secondary" className="w-full" disabled>
          <Apple className="mr-2 h-4 w-4" /> Connect to Apple Health
        </Button>
        <div className="space-y-2">
          <Button onClick={handleGenerateSummary} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Health Summary
          </Button>
          {summary && (
            <Textarea
              readOnly
              value={summary}
              className="mt-2 h-32 text-sm"
              placeholder="Your health summary will appear here..."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
