"use client";

import { useEffect, useRef } from "react";
import { Check, X, Info } from "lucide-react";
import type { ToastMessage } from "../types";

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}) {
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  useEffect(() => {
    const timer = setTimeout(() => onRemoveRef.current(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const styles = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-gray-800 text-white",
  };

  const icons = {
    success: <Check className="w-4 h-4" />,
    error: <X className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${styles[toast.type]}`}
    >
      {icons[toast.type]}
      {toast.text}
    </div>
  );
}
