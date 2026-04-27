// les composants boutons reutilisables components/form/Formbutton.tsx
"use client";

import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  isLoading?: boolean;
}

export default function FormButton({ 
  children, 
  variant = "primary", 
  fullWidth = true, 
  isLoading = false,
  className = "", 
  disabled,
  ...props 
}: ButtonProps) {
  
  const baseStyles = "py-4 px-6 rounded-2xl font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#111] text-white hover:bg-black shadow-lg shadow-slate-200",
    secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
  };

  return (
    <button 
      {...props}
      disabled={isLoading || disabled}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${isLoading || disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" size={18} /> En cours...
        </>
      ) : (
        children
      )}
    </button>
  );
}