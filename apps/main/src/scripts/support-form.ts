import type { Locale } from "../data/apps";
import {
  buildSupportRequest,
  type FormStatus,
  getOrCreateClientId,
  initialSelections,
  isValidEmail,
  requiresEmail,
  SUPPORT_API_URL,
  SUPPORT_TIMEOUT_MS,
  type SupportFieldErrors,
  type SupportFormValues,
  SupportRequestCycle,
  showsReplyToggle,
  statusForApiResponse,
  validateSupportForm,
} from "../lib/support";
import { supportCopy } from "../lib/support-copy";

interface ApiResponse {
  requestId?: unknown;
  code?: unknown;
  fields?: Record<string, unknown>;
}

/** Turnstile, when the page loaded it. Absent whenever no site key is set. */
declare global {
  interface Window {
    turnstile?: { reset(widget?: string | HTMLElement): void };
  }
}

/**
 * Wait briefly for Turnstile's token.
 *
 * The widget solves itself in well under a second, and a person needs longer
 * than that to write a message — but a slow network could still have someone
 * pressing submit first, and sending without the token means a rejection they
 * did nothing to deserve.
 */
async function turnstileToken(
  form: HTMLFormElement,
  widget: HTMLElement | null,
): Promise<string | undefined> {
  if (!widget) return undefined;
  const read = () => {
    const field = form.elements.namedItem("turnstileToken");
    return field instanceof HTMLInputElement ? field.value : "";
  };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const token = read();
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return undefined;
}

function initializeSupportForm(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>("[data-support-form]");
  const success = root.querySelector<HTMLElement>("[data-support-success]");
  const receipt = root.querySelector<HTMLElement>("[data-support-receipt]");
  const statusBox = root.querySelector<HTMLElement>("[data-support-status]");
  const submit = root.querySelector<HTMLButtonElement>("[data-support-submit]");
  const newRequest = root.querySelector<HTMLButtonElement>("[data-support-new]");
  const counter = root.querySelector<HTMLElement>("[data-message-count]");
  if (!form || !success || !receipt || !statusBox || !submit || !newRequest || !counter) return;

  const locale: Locale = root.dataset.locale === "en" ? "en" : "ja";
  const copy = supportCopy[locale];
  const cycle = new SupportRequestCycle();
  let storage: Storage | undefined;
  try {
    storage = window.localStorage;
  } catch {
    storage = undefined;
  }
  const clientId = getOrCreateClientId(storage);
  const app = form.elements.namedItem("app") as HTMLSelectElement;
  const category = form.elements.namedItem("category") as HTMLSelectElement;
  const name = form.elements.namedItem("name") as HTMLInputElement;
  const email = form.elements.namedItem("email") as HTMLInputElement;
  const replyCheckbox = form.elements.namedItem("replyRequested") as HTMLInputElement;
  const emailField = root.querySelector<HTMLElement>("[data-email-field]");
  const replyToggle = root.querySelector<HTMLElement>("[data-reply-toggle]");
  const message = form.elements.namedItem("message") as HTMLTextAreaElement;
  const website = form.elements.namedItem("website") as HTMLInputElement;
  const turnstileWidget = root.querySelector<HTMLElement>("[data-support-turnstile]");
  const fieldElements = { name, email, message } as const;
  const selections = initialSelections(new URLSearchParams(window.location.search));
  app.value = selections.app;
  category.value = selections.category;

  const values = (): SupportFormValues => ({
    app: app.value,
    category: category.value,
    name: name.value,
    email: email.value,
    replyRequested: replyCheckbox.checked,
    message: message.value,
    website: website.value,
  });

  // A category that already implies a reply (currently just "question") never
  // shows the toggle — email is required outright. Everything else offers
  // the toggle, off by default, and only asks for email once it's checked.
  const updateEmailVisibility = () => {
    const toggleVisible = showsReplyToggle(category.value);
    if (replyToggle) replyToggle.hidden = !toggleVisible;

    const wanted = requiresEmail({
      category: category.value,
      replyRequested: replyCheckbox.checked,
    });
    if (emailField) emailField.hidden = !wanted;
    email.required = wanted;
    if (!wanted) {
      const error = root.querySelector<HTMLElement>('[data-error-for="email"]');
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }
      email.removeAttribute("aria-invalid");
    }
  };

  const setStatus = (status: FormStatus, text = "") => {
    cycle.complete(status);
    root.dataset.state = status;
    statusBox.textContent = text;
    statusBox.hidden = !text;
    submit.textContent = status === "submitting" ? copy.submitting : copy.submit;
    updateSubmit();
  };

  const updateSubmit = () => {
    submit.disabled =
      cycle.status === "submitting" ||
      (requiresEmail({ category: category.value, replyRequested: replyCheckbox.checked }) &&
        !isValidEmail(email.value)) ||
      message.value.trim().length < 10 ||
      message.value.trim().length > 5000;
    submit.setAttribute("aria-busy", String(cycle.status === "submitting"));
  };

  const fieldErrorText = (field: keyof SupportFieldErrors, code: string): string => {
    if (field === "name") return copy.errors.nameLong;
    if (field === "email") {
      return code === "REQUIRED" ? copy.errors.emailRequired : copy.errors.emailInvalid;
    }
    if (code === "REQUIRED") return copy.errors.messageRequired;
    if (code === "TOO_SHORT") return copy.errors.messageShort;
    return copy.errors.messageLong;
  };

  const clearErrors = () => {
    for (const [field, element] of Object.entries(fieldElements)) {
      const error = root.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }
      element.removeAttribute("aria-invalid");
    }
  };

  const showErrors = (errors: SupportFieldErrors) => {
    clearErrors();
    let first: HTMLInputElement | HTMLTextAreaElement | undefined;
    for (const [field, code] of Object.entries(errors)) {
      if (!(field in fieldElements) || !code) continue;
      const typedField = field as keyof typeof fieldElements;
      const element = fieldElements[typedField];
      const error = root.querySelector<HTMLElement>(`[data-error-for="${typedField}"]`);
      if (error) {
        error.textContent = fieldErrorText(typedField, code);
        error.hidden = false;
      }
      element.setAttribute("aria-invalid", "true");
      first ??= element;
    }
    first?.focus();
  };

  const messageForStatus = (status: FormStatus): string => {
    const messages: Partial<Record<FormStatus, string>> = {
      validation_error: copy.errors.form,
      rate_limited: copy.errors.rateLimited,
      delivery_failed: copy.errors.deliveryFailed,
      server_error: copy.errors.serverError,
      network_error: copy.errors.network,
      verification_failed: copy.errors.verificationFailed,
      timeout: copy.errors.timeout,
    };
    return messages[status] ?? "";
  };

  const updateCounter = () => {
    counter.textContent = `${message.value.length} / 5000`;
    updateSubmit();
  };

  form.addEventListener("input", () => {
    cycle.markEditing();
    clearErrors();
    setStatus(cycle.status);
    updateCounter();
  });

  for (const [field, element] of Object.entries(fieldElements)) {
    element.addEventListener("blur", () => {
      const errors = validateSupportForm(values());
      const code = errors[field as keyof SupportFieldErrors];
      if (code) showErrors({ [field]: code });
    });
  }

  category.addEventListener("change", () => {
    updateEmailVisibility();
    updateSubmit();
  });
  replyCheckbox.addEventListener("change", () => {
    updateEmailVisibility();
    updateSubmit();
    if (replyCheckbox.checked) email.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!cycle.begin()) return;

    const input = values();
    const errors = validateSupportForm(input);
    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      setStatus("validation_error", copy.errors.form);
      return;
    }

    clearErrors();
    setStatus("submitting");
    const requestId = cycle.requestId;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SUPPORT_TIMEOUT_MS);

    try {
      const token = await turnstileToken(form, turnstileWidget);
      const response = await fetch(SUPPORT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildSupportRequest(input, { requestId, clientId, locale, turnstileToken: token }),
        ),
        signal: controller.signal,
      });
      let data: ApiResponse = {};
      try {
        data = (await response.json()) as ApiResponse;
      } catch {
        data = {};
      }

      const status = statusForApiResponse(response.status, data.requestId, requestId, data.code);
      if (status === "validation_error" && data.fields && typeof data.fields === "object") {
        const safeErrors: SupportFieldErrors = {};
        for (const field of ["name", "email", "message"] as const) {
          const code = data.fields[field];
          if (typeof code === "string") safeErrors[field] = code as never;
        }
        showErrors(safeErrors);
      }
      if (status === "success") {
        setStatus("success");
        form.hidden = true;
        success.hidden = false;
        receipt.textContent = requestId;
        success.focus();
      } else {
        // A Turnstile token is spent once it has been checked, so anything
        // short of success needs a fresh one before the next attempt.
        window.turnstile?.reset(turnstileWidget ?? undefined);
        setStatus(status, messageForStatus(status));
      }
    } catch (error) {
      const status =
        error instanceof DOMException && error.name === "AbortError" ? "timeout" : "network_error";
      window.turnstile?.reset(turnstileWidget ?? undefined);
      setStatus(status, messageForStatus(status));
    } finally {
      window.clearTimeout(timeout);
      updateSubmit();
    }
  });

  newRequest.addEventListener("click", () => {
    cycle.startNew();
    category.value = "question";
    email.value = "";
    replyCheckbox.checked = false;
    message.value = "";
    website.value = "";
    window.turnstile?.reset(turnstileWidget ?? undefined);
    clearErrors();
    updateEmailVisibility();
    success.hidden = true;
    form.hidden = false;
    setStatus("idle");
    updateCounter();
    category.focus();
  });

  updateEmailVisibility();
  updateCounter();
}

document.querySelectorAll<HTMLElement>("[data-support-root]").forEach(initializeSupportForm);
