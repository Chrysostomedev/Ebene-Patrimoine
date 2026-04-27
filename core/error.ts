/**
 * core/error.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Traduction centralisée de TOUTES les erreurs renvoyées par le back.
 *
 * Règle : aucun message brut en anglais ne doit apparaître au front.
 * Utilisation :
 *   import { parseApiError } from "@/core/error";
 *   const message = parseApiError(err);
 *   toast.error(message);
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiErrorResponse {
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
    status?: number;
}

// ── Table de traduction : clé = fragment du message back, valeur = message FR ─

const ERROR_MAP: Record<string, string> = {

    // ── Auth & session ─────────────────────────────────────────────────────────
    "unauthenticated": "Votre session a expiré. Veuillez vous reconnecter.",
    "unauthorized": "Vous n'avez pas les droits pour effectuer cette action.",
    "invalid credentials": "Identifiants incorrects. Vérifiez votre email et mot de passe.",
    "invalid otp": "Code OTP invalide ou expiré. Veuillez réessayer.",
    "otp expired": "Le code OTP a expiré. Demandez-en un nouveau.",
    "too many attempts": "Trop de tentatives. Veuillez patienter avant de réessayer.",
    "token not found": "Session introuvable. Veuillez vous reconnecter.",
    "token expired": "Votre session a expiré. Veuillez vous reconnecter.",
    "token invalid": "Session invalide. Veuillez vous reconnecter.",

    // ── Validation générique ───────────────────────────────────────────────────
    "the given data was invalid": "Certains champs sont invalides. Vérifiez le formulaire.",
    "validation error": "Erreur de validation. Vérifiez les champs saisis.",
    "the email field is required": "L'adresse email est obligatoire.",
    "the email has already been taken": "Cette adresse email est déjà utilisée.",
    "the password field is required": "Le mot de passe est obligatoire.",
    "the password must be at least": "Le mot de passe doit contenir au moins 8 caractères.",
    "the name field is required": "Le nom est obligatoire.",
    "the phone field is required": "Le numéro de téléphone est obligatoire.",
    "the field is required": "Ce champ est obligatoire.",

    // ── Fichiers & uploads ─────────────────────────────────────────────────────
    "request entity too large": "Le fichier est trop volumineux, veuillez le réduire à 2 Mo.",
    "payload too large": "Le fichier est trop volumineux, veuillez le réduire à 2 Mo.",
    "413": "Le fichier est trop volumineux, veuillez le réduire à 2 Mo.",
    "the file may not be greater than": "Le fichier dépasse la taille maximale autorisée.",
    "the file must be a file of type": "Format de fichier non supporté. Formats acceptés : JPG, PNG, PDF.",
    "the image": "L'image est trop volumineuse, veuillez le réduire à 2 Mo.",
    "failed to upload": "L'envoi du fichier a échoué. Vérifiez votre connexion et réessayez.",

    // ── Profil ─────────────────────────────────────────────────────────────────
    "profile not found": "Profil introuvable.",
    "failed to update profile": "La mise à jour du profil a échoué. Réessayez.",
    "failed to update password": "La modification du mot de passe a échoué.",
    "current password is incorrect": "Le mot de passe actuel est incorrect.",

    // ── Tickets ────────────────────────────────────────────────────────────────
    "ticket not found": "Ce ticket est introuvable.",
    "ticket already closed": "Ce ticket est déjà clôturé.",
    "ticket already assigned": "Ce ticket est déjà assigné.",
    "cannot update a closed ticket": "Impossible de modifier un ticket clôturé.",

    // ── Interventions ──────────────────────────────────────────────────────────
    "intervention not found": "Cette intervention est introuvable.",
    "intervention already started": "Cette intervention est déjà en cours.",
    "intervention already completed": "Cette intervention est déjà terminée.",

    // ── Devis ──────────────────────────────────────────────────────────────────
    "devis not found": "Ce devis est introuvable.",
    "devis already validated": "Ce devis est déjà validé.",
    "devis already rejected": "Ce devis a déjà été refusé.",

    // ── Factures ──────────────────────────────────────────────────────────────
    "invoice not found": "Cette facture est introuvable.",
    "invoice already paid": "Cette facture est déjà réglée.",

    // ── Sites ──────────────────────────────────────────────────────────────────
    "site not found": "Ce site est introuvable.",
    "site already exists": "Un site avec ce nom existe déjà.",

    // ── Utilisateurs ──────────────────────────────────────────────────────────
    "user not found": "Utilisateur introuvable.",
    "user already exists": "Un utilisateur avec cet email existe déjà.",
    "cannot delete your own account": "Vous ne pouvez pas supprimer votre propre compte.",

    // ── Réseau & serveur ───────────────────────────────────────────────────────
    "network error": "Impossible de joindre le serveur. Vérifiez votre connexion.",
    "internal server error": "Une erreur serveur est survenue. Réessayez dans quelques instants.",
    "service unavailable": "Le service est temporairement indisponible. Réessayez plus tard.",
    "bad gateway": "Le serveur ne répond pas. Réessayez dans quelques instants.",
    "timeout": "La requête a pris trop de temps. Vérifiez votre connexion.",
    "econnrefused": "Impossible de joindre le serveur. Vérifiez votre connexion.",
    "econnaborted": "La connexion a été interrompue. Réessayez.",

    // ── Génériques ────────────────────────────────────────────────────────────
    "forbidden": "Accès interdit. Vous n'avez pas les droits nécessaires.",
    "not found": "La ressource demandée est introuvable.",
    "method not allowed": "Action non autorisée.",
    "conflict": "Un conflit a été détecté. Vérifiez les données saisies.",
    "unprocessable": "Les données envoyées sont invalides.",
    "too many requests": "Trop de requêtes envoyées. Patientez quelques secondes.",
};

// ── Traduction des erreurs de validation Laravel (champ par champ) ─────────────

const VALIDATION_FIELD_MAP: Record<string, string> = {
    email: "Email",
    password: "Mot de passe",
    name: "Nom",
    phone: "Téléphone",
    image: "Image",
    file: "Fichier",
    subject: "Sujet",
    description: "Description",
    site_id: "Site",
    service_id: "Service",
    planned_at: "Date planifiée",
    status: "Statut",
    type: "Type",
    amount: "Montant",
    title: "Titre",
};

// ── Fonction principale ────────────────────────────────────────────────────────

/**
 * parseApiError(error)
 *
 * Accepte :
 *   - une erreur Axios (error.response.data, error.response.status)
 *   - une erreur réseau (error.message)
 *   - un objet ApiErrorResponse brut
 *   - n'importe quoi d'autre (fallback générique)
 *
 * Retourne toujours un string FR lisible.
 */
export function parseApiError(error: any): string {

    // ── 0. Vérification préalable : Fichier trop lourd ────────────────────────
    // Si Axios renvoie "Network Error" alors qu'on envoyait un fichier (FormData),
    // c'est presque toujours un code 413 (Payload Too Large) bloqué par CORS ou
    // coupé par le serveur avant la réponse habituelle.
    if (isFileTooLarge(error)) {
        return "Le fichier est trop volumineux, veuillez le réduire à 2 Mo.";
    }

    // ── 1. Erreur Axios avec réponse HTTP ──────────────────────────────────────
    if (error?.response) {
        const status: number = error.response.status;
        const data: ApiErrorResponse = error.response.data ?? {};

        // Erreurs de validation Laravel : { errors: { field: ["message"] } }
        if (data.errors && typeof data.errors === "object") {
            const firstKey = Object.keys(data.errors)[0];
            const firstError = data.errors[firstKey]?.[0] ?? "";

            // Cherche une traduction dans ERROR_MAP
            const translated = findInMap(firstError);
            if (translated) return translated;

            // Fallback : "Champ X : message brut traduit si possible"
            const fieldLabel = VALIDATION_FIELD_MAP[firstKey] ?? firstKey;
            return `${fieldLabel} : ${firstError}`;
        }

        // Message d'erreur dans data.message ou data.error
        const rawMessage = data.message ?? data.error ?? "";
        if (rawMessage) {
            const translated = findInMap(rawMessage);
            if (translated) return translated;
        }

        // Fallback par code HTTP
        return httpStatusToMessage(status);
    }

    // ── 2. Erreur réseau (pas de réponse du serveur) ───────────────────────────
    if (error?.message) {
        const translated = findInMap(error.message);
        if (translated) return translated;

        // Axios network error générique
        if (error.message === "Network Error") {
            return "Impossible de joindre le serveur. Vérifiez votre connexion.";
        }
    }

    // ── 3. String brute passée directement ────────────────────────────────────
    if (typeof error === "string") {
        const translated = findInMap(error);
        if (translated) return translated;
        return error;
    }

    // ── 4. Fallback ultime ────────────────────────────────────────────────────
    return "Une erreur inattendue est survenue. Veuillez réessayer.";
}

// ── Helpers privés ─────────────────────────────────────────────────────────────

/**
 * Cherche une traduction dans ERROR_MAP.
 * Comparaison insensible à la casse, sur des fragments de texte.
 */
function findInMap(raw: string): string | null {
    const lower = raw.toLowerCase().trim();
    for (const [key, value] of Object.entries(ERROR_MAP)) {
        if (lower.includes(key.toLowerCase())) return value;
    }
    return null;
}

/** Retourne un message FR lisible selon le code HTTP. */
function httpStatusToMessage(status: number): string {
    switch (status) {
        case 400: return "Requête invalide. Vérifiez les données envoyées.";
        case 401: return "Session expirée. Veuillez vous reconnecter.";
        case 403: return "Accès interdit. Vous n'avez pas les droits nécessaires.";
        case 404: return "La ressource demandée est introuvable.";
        case 405: return "Action non autorisée.";
        case 409: return "Un conflit a été détecté. Vérifiez les données saisies.";
        case 413: return "Le fichier est trop volumineux, veuillez le réduire à 2 Mo.";
        case 422: return "Les données envoyées sont invalides.";
        case 429: return "Trop de requêtes. Patientez quelques secondes avant de réessayer.";
        case 500: return "Erreur serveur. Réessayez dans quelques instants.";
        case 502: return "Le serveur ne répond pas. Réessayez dans quelques instants.";
        case 503: return "Service temporairement indisponible. Réessayez plus tard.";
        default: return `Une erreur est survenue (code ${status}). Réessayez.`;
    }
}

/**
 * isNetworkError(error)
 * Utilitaire : true si l'erreur est une perte de connexion (pas de response).
 */
export function isNetworkError(error: any): boolean {
    return !error?.response && !!error?.request;
}

/**
 * isAuthError(error)
 * Utilitaire : true si 401 (session expirée).
 */
export function isAuthError(error: any): boolean {
    return error?.response?.status === 401;
}

/**
 * isFileTooLarge(error)
 * Utilitaire : true si 413 (payload too large) ou erreur réseau suspecte lors d'un upload.
 */
export function isFileTooLarge(error: any): boolean {
    // Cas 1 : Le serveur a répondu explicitement 413
    if (error?.response?.status === 413) return true;
    
    // Cas 2 : Erreur réseau alors qu'on envoyait un FormData (fichiers)
    // C'est le comportement classique des navigateurs quand Nginx/Apache coupe la connexion 413 abruptement.
    if (error?.message === "Network Error" && error?.config?.data instanceof FormData) {
        return true;
    }

    return false;
}