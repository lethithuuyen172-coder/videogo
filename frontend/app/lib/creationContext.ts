export type CreationContext = {
  prompt: string;
  reference: string;
  subject: string;
  subject_material_id: string;
};

export function readCreationContext(searchParams: URLSearchParams): CreationContext {
  const contextId = searchParams.get("context_id");
  if (contextId && typeof window !== "undefined") {
    const raw = sessionStorage.getItem(`videogo:create:${contextId}`);
    if (raw) {
      try {
        const data = JSON.parse(raw) as Partial<CreationContext>;
        return {
          prompt: data.prompt ?? "",
          reference: data.reference ?? "",
          subject: data.subject ?? "",
          subject_material_id: data.subject_material_id ?? "",
        };
      } catch {
        sessionStorage.removeItem(`videogo:create:${contextId}`);
      }
    }
  }
  return {
    prompt: searchParams.get("prompt") ?? "",
    reference: searchParams.get("reference") ?? "",
    subject: searchParams.get("subject") ?? "",
    subject_material_id: searchParams.get("subject_material_id") ?? "",
  };
}
