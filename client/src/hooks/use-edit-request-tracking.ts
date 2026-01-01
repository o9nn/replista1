
import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

interface EditRequest {
  id: string;
  timestamp: Date;
  cost: number;
  messageId: string;
  applied: boolean;
}

export function useEditRequestTracking() {
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);

  const trackEditRequest = useCallback((messageId: string, applied: boolean) => {
    const request: EditRequest = {
      id: `edit_${Date.now()}`,
      timestamp: new Date(),
      cost: 0.05, // 5 cents per edit request
      messageId,
      applied,
    };

    setEditRequests(prev => [...prev, request]);

    // Log to backend for billing
    fetch("/api/credits/track-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }).catch(console.error);
  }, []);

  const getTotalCost = useCallback(() => {
    return editRequests.reduce((sum, req) => sum + req.cost, 0);
  }, [editRequests]);

  const getMonthlyTotal = useCallback(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return editRequests
      .filter(req => req.timestamp >= monthStart)
      .reduce((sum, req) => sum + req.cost, 0);
  }, [editRequests]);

  return {
    editRequests,
    trackEditRequest,
    getTotalCost,
    getMonthlyTotal,
  };
}
