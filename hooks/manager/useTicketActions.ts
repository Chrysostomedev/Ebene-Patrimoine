// hooks/manager/useTicketActions.ts
"use client";

import { useState } from "react";
import { TicketService } from "../../services/manager/ticket.service";
import { Ticket, UpdateTicketPayload } from "../../types/manager.types";

export interface UseTicketActionsOptions {
  onSuccess?: () => void;
}

export function useTicketActions(options?: UseTicketActionsOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createTicket = async (payload: {
    company_asset_id: number | string;
    service_id?: number | string;
    priority: string;
    type: string;
    planned_at: string;
    due_at?: string;
    description?: string;
    subject?: string;
    site_id?: number | string | null;
    attachments?: File[];
  }) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Normalise les types et calcule due_at si absent
      const plannedAt = payload.planned_at || new Date().toISOString().slice(0, 10);
      let dueAt = payload.due_at;
      if (!dueAt) {
        const planned = new Date(plannedAt);
        const hours = payload.type === "curatif" ? 72 : 7 * 24;
        dueAt = new Date(planned.getTime() + hours * 3600000)
          .toISOString().slice(0, 19).replace("T", " ");
      }

      const clean: any = {
        company_asset_id: Number(payload.company_asset_id),
        priority:         payload.priority,
        type:             payload.type || "curatif",
        planned_at:       plannedAt.includes(" ") || plannedAt.includes("T")
          ? plannedAt : plannedAt + " 00:00:00",
        due_at: dueAt.includes(" ") || dueAt.includes("T")
          ? dueAt : dueAt + " 00:00:00",
      };
      // site_id requis par le back même si le manager le force côté serveur
      if (payload.site_id) clean.site_id = Number(payload.site_id);
      if (payload.service_id)  clean.service_id  = Number(payload.service_id);
      if (payload.subject)     clean.subject      = payload.subject;
      if (payload.description) clean.description  = payload.description;

      // Ajout des pièces jointes (photos)
      // On accepte 'attachments' (nouveau standard) ou 'image' (ancien champ form) 
      // et on mappe tout vers 'attachments' pour le service.
      if (payload.attachments) {
        clean.attachments = payload.attachments;
      } else if ((payload as any).image) {
        clean.attachments = (payload as any).image;
      }


      const newTicket = await TicketService.createTicket(clean);
      setSuccess("Le ticket a été créé avec succès.");
      options?.onSuccess?.();
      return newTicket;
    } catch (err: any) {
      const msg = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" | ")
        : err?.response?.data?.message ?? "Une erreur est survenue lors de la création du ticket.";
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTicket = async (id: number, payload: UpdateTicketPayload) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const updatedTicket = await TicketService.updateTicket(id, payload);
      setSuccess("Le ticket a été mis à jour.");
      options?.onSuccess?.();
      return updatedTicket;
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Une erreur est survenue lors de la mise à jour du ticket.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const rateTicket = async (id: number, payload: { rating: number; comment?: string }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await TicketService.rateTicket(id, payload);
      setSuccess("L'intervention a été notée.");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Une erreur est survenue lors de la notation.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    success,
    createTicket,
    updateTicket,
    rateTicket,
    clearStatus: () => { setError(null); setSuccess(null); }
  };
}
