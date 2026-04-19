import { supabase } from "@/integrations/supabase/client";
import { getViewableUrl } from "@/lib/storage-url";

export interface ResourceOrder {
  id: string;
  incident_truck_id: string;
  organization_id: string | null;
  file_url: string;
  file_name: string;
  agreement_number: string | null;
  resource_order_number: string | null;
  parsed_data: Record<string, any>;
  parsed_at: string | null;
  created_at: string;
}

export async function fetchResourceOrders(incidentTruckId: string): Promise<ResourceOrder[]> {
  const { data, error } = await supabase
    .from("resource_orders")
    .select("*")
    .eq("incident_truck_id", incidentTruckId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ResourceOrder[];
}

export async function uploadResourceOrderFile(file: File, organizationId?: string): Promise<string> {
  if (!organizationId) {
    throw new Error("Cannot upload resource order without an organization");
  }
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("resource-orders").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("resource-orders").getPublicUrl(path);
  return data.publicUrl;
}

export async function createResourceOrder(order: {
  incident_truck_id: string;
  organization_id?: string | null;
  file_url: string;
  file_name: string;
}): Promise<ResourceOrder> {
  const { data, error } = await supabase
    .from("resource_orders")
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data as ResourceOrder;
}

export async function updateResourceOrderParsed(
  id: string,
  parsed: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from("resource_orders")
    .update({
      parsed_data: parsed,
      agreement_number: parsed.agreement_number || parsed.contract_number || null,
      resource_order_number: parsed.resource_order_number || null,
      parsed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function parseResourceOrderAI(fileUrl: string, fileName: string): Promise<Record<string, any>> {
  const resolved = (await getViewableUrl(fileUrl)) ?? fileUrl;
  const { data, error } = await supabase.functions.invoke("parse-resource-order", {
    body: { fileUrl: resolved, fileName },
  });
  if (error) throw error;
  return data?.parsed || {};
}
