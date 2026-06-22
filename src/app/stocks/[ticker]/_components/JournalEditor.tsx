"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { upsertJournalAction } from "@/server/journal.actions";

interface JournalEditorProps {
  ticker: string;
  field: "buyThesis" | "riskFactors" | "exitCriteria" | "technicalNotes" | "dailyNotes"; // technically daily/technical are different models, but we can simplify or handle it
  initialValue?: string;
}

export function JournalEditor({ ticker, field, initialValue }: JournalEditorProps) {
  const [content, setContent] = useState(initialValue || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    
    // For Phase 4, we use upsertJournalAction for buyThesis, riskFactors, exitCriteria.
    // DailyNotes and TechnicalNotes ideally go to their own models, but for UI simplicity here we assume they map to the same or we handle them similarly.
    const res = await upsertJournalAction(ticker, { [field]: content });
    
    setSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-4">
      <RichTextEditor content={content} onChange={setContent} />
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={saving || content === initialValue}>
          {saving ? "Saving..." : "Save"}
        </Button>
        {saved && <span className="text-sm text-emerald-500">Saved successfully!</span>}
      </div>
    </div>
  );
}
