"use client";

import { CheckCircle2, XCircle } from "lucide-react";

interface ToastProps {
  message?: string;
  msg?: string;
  type?: "success" | "error";
  toast?: { message: string; type: "success" | "error" };
}

export default function Toast({ message, msg, type, toast }: ToastProps) {
  const finalMessage = message || msg || toast?.message;
  const finalType = toast?.type || type;

  if (!finalMessage) return null;

  return (
    <div className={`
      fixed bottom-6 right-6 z-[999999] flex items-center gap-3
      px-5 py-4 rounded-2xl shadow-2xl border text-sm font-semibold
      animate-in slide-in-from-bottom-4 duration-300
      ${finalType === "success"
        ? "bg-white border-green-100 text-green-700"
        : "bg-white border-red-100 text-red-700"}
    `}>
      {finalType === "success"
        ? <CheckCircle2 size={20} className="text-green-500 shrink-0" />
        : <XCircle size={20} className="text-red-500 shrink-0" />}
      {finalMessage}
    </div>
  );
}
