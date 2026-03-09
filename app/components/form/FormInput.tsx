"use client";
import React, { useRef, useState, useCallback } from "react";
import { Eye, EyeOff, Calendar,
  Bold, Italic, Underline, List, Strikethrough, 
  Palette, Highlighter, AlignLeft, AlignCenter, AlignRight, 
  CornerDownLeft, Plus, Minus, ImagePlus, X, Upload
} from "lucide-react";

// Input Standard
export const FormField = ({ label, required, children }: any) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-sm font-bold text-slate-900 tracking-tight">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

// Input Texte
export const Input = (props: any) => (
  <input 
    {...props} 
    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 transition-all outline-none"
  />
);

// Select (Style "Dropdown")
export const Select = ({ children, ...props }: any) => (
  <div className="relative">
    <select 
      {...props} 
      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-slate-900"
    >
      {children}
    </select>
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
       <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/></svg>
    </div>
  </div>
);

// Champ Password
export const PasswordInput = (props: any) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input 
        {...props} 
        type={show ? "text" : "password"}
        className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 transition-all"
      />
      <button 
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
};

// Champ Date
export const DateInput = (props: any) => (
  <div className="relative">
    <input 
      {...props} 
      type="date"
      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
    />
    <Calendar size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  </div>
);

// ─── IMAGE UPLOAD ──────────────────────────────────────────────────────────────
interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export const ImageUpload = ({
  name,
  maxImages = 3,
  accept = "image/*",
}: {
  name?: string;
  maxImages?: number;
  accept?: string;
}) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const incoming = Array.from(files).slice(0, maxImages - images.length);
      const newImages: ImageFile[] = incoming.map((file) => ({
        id: Math.random().toString(36).slice(2),
        file,
        preview: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newImages].slice(0, maxImages));
    },
    [images.length, maxImages]
  );

  const remove = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const canAdd = images.length < maxImages;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Drop zone — hidden when full */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3 w-full
            min-h-[140px] rounded-3xl cursor-pointer select-none
            transition-all duration-200
            ${dragging
              ? "bg-slate-900 ring-2 ring-slate-900 ring-offset-2"
              : "bg-slate-50 hover:bg-slate-100"
            }
          `}
        >
          <div className={`
            flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200
            ${dragging ? "bg-white/20" : "bg-white shadow-sm"}
          `}>
            <Upload
              size={22}
              className={dragging ? "text-white" : "text-slate-500"}
              strokeWidth={2}
            />
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold transition-colors duration-200 ${dragging ? "text-white" : "text-slate-700"}`}>
              {dragging ? "Déposez ici" : "Glissez vos images"}
            </p>
            <p className={`text-xs mt-0.5 transition-colors duration-200 ${dragging ? "text-white/70" : "text-slate-400"}`}>
              ou cliquez pour parcourir · {images.length}/{maxImages} image{maxImages > 1 ? "s" : ""}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={maxImages > 1}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
            name={name}
          />
        </div>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className={`grid gap-3 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {images.map((img, i) => (
            <div
              key={img.id}
              className="group relative rounded-2xl overflow-hidden bg-slate-100 aspect-square"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Image */}
              <img
                src={img.preview}
                alt={img.file.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all duration-200 rounded-2xl" />

              {/* File name chip */}
              <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <p className="text-[10px] font-semibold text-white truncate bg-slate-900/60 backdrop-blur-sm rounded-xl px-2 py-1">
                  {img.file.name}
                </p>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => remove(img.id)}
                className="
                  absolute top-2 right-2 w-7 h-7 rounded-xl
                  flex items-center justify-center
                  bg-white/90 hover:bg-white shadow-sm
                  opacity-0 group-hover:opacity-100
                  transition-all duration-150 active:scale-90
                "
              >
                <X size={14} strokeWidth={2.5} className="text-slate-700" />
              </button>

              {/* Index badge */}
              <div className="absolute top-2 left-2 w-5 h-5 rounded-lg bg-slate-900/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-[9px] font-bold text-white">{i + 1}</span>
              </div>
            </div>
          ))}

          {/* Inline "add more" slot when grid has space */}
          {canAdd && images.length > 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="
                aspect-square rounded-2xl border-2 border-dashed border-slate-200
                flex flex-col items-center justify-center gap-1.5
                hover:border-slate-400 hover:bg-slate-50
                transition-all duration-200 active:scale-95
              "
            >
              <ImagePlus size={20} strokeWidth={2} className="text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-400">Ajouter</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── RICH TEXT EDITOR ─────────────────────────────────────────────────────────
export const RichTextEditor = ({ label, placeholder, name }: any) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const applyStyle = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const changeFontSize = (delta: number) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    applyStyle("fontSize", delta > 0 ? "5" : "2");
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="w-full bg-slate-50 rounded-3xl overflow-hidden border border-transparent focus-within:ring-2 focus-within:ring-slate-900 transition-all">
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-200/50 border-b border-slate-200">
          <ToolbarButton icon={Bold} onClick={() => applyStyle("bold")} />
          <ToolbarButton icon={Italic} onClick={() => applyStyle("italic")} />
          <ToolbarButton icon={Underline} onClick={() => applyStyle("underline")} />
          <ToolbarButton icon={Strikethrough} onClick={() => applyStyle("strikeThrough")} />
          
          <div className="w-[1px] h-4 bg-slate-300 mx-1" />
          
          <ToolbarButton icon={Plus} onClick={() => changeFontSize(1)} title="Agrandir" />
          <ToolbarButton icon={Minus} onClick={() => changeFontSize(-1)} title="Réduire" />

          <div className="w-[1px] h-4 bg-slate-300 mx-1" />

          <div className="relative">
            <ToolbarButton icon={Palette} onClick={() => colorInputRef.current?.click()} title="Couleur texte" />
            <input type="color" ref={colorInputRef} className="invisible absolute w-0 h-0" onChange={(e) => applyStyle("foreColor", e.target.value)} />
          </div>
          <div className="relative">
            <ToolbarButton icon={Highlighter} onClick={() => bgInputRef.current?.click()} title="Surligneur" />
            <input type="color" ref={bgInputRef} className="invisible absolute w-0 h-0" onChange={(e) => applyStyle("backColor", e.target.value)} />
          </div>

          <div className="w-[1px] h-4 bg-slate-300 mx-1" />

          <ToolbarButton icon={AlignLeft} onClick={() => applyStyle("justifyLeft")} />
          <ToolbarButton icon={AlignCenter} onClick={() => applyStyle("justifyCenter")} />
          <ToolbarButton icon={AlignRight} onClick={() => applyStyle("justifyRight")} />
          <ToolbarButton icon={List} onClick={() => applyStyle("insertUnorderedList")} />
          <ToolbarButton icon={CornerDownLeft} onClick={() => applyStyle("insertHorizontalRule")} title="Ligne de séparation" />
        </div>

        <div 
          ref={editorRef}
          contentEditable 
          className="w-full min-h-[180px] p-5 text-slate-700 outline-none bg-transparent prose prose-slate max-w-none leading-relaxed"
          onInput={(e) => {
            const hiddenInput = document.getElementById(`hidden-${name}`) as HTMLInputElement;
            if (hiddenInput) hiddenInput.value = e.currentTarget.innerHTML;
          }}
        />
        <input type="hidden" name={name} id={`hidden-${name}`} />
      </div>
    </div>
  );
};

const ToolbarButton = ({ icon: Icon, onClick, title }: any) => (
  <button 
    type="button"
    title={title}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-slate-900 transition-all active:scale-90"
  >
    <Icon size={18} strokeWidth={2.5} />
  </button>
);