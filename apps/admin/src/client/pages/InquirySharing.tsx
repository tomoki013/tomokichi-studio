import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router";
import { InquiryShare, type ShareMessage } from "../components/InquiryShare";
import { DataState, Page } from "../components/primitives";
import { api } from "../lib/api";

export function InquirySharing() {
  const { project = "" } = useParams();
  const { hash } = useLocation();
  const ticket = hash.slice(1);
  const valid = /^[a-z0-9-]{1,64}$/.test(project) && /^[A-Za-z0-9-]{1,100}$/.test(ticket);
  const endpoint = `/api/inquiry-sharing/${project}/${ticket}`;
  const context = useQuery({
    queryKey: ["inquiry-sharing", project, ticket],
    queryFn: () => api.get<{ messages: ShareMessage[] }>(endpoint),
    enabled: valid,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return (
    <Page title="問い合わせをAIに共有">
      <DataState
        loading={valid && context.isPending}
        error={context.error}
        empty={!valid || context.data?.messages.length === 0}
        emptyMessage="共有できる問い合わせがありません。"
      >
        {context.data?.messages.length ? (
          <InquiryShare key={endpoint} source={context.data.messages} endpoint={endpoint} />
        ) : null}
      </DataState>
    </Page>
  );
}
