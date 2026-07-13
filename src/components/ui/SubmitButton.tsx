'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

export function SubmitButton({ 
  children,
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing in...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
