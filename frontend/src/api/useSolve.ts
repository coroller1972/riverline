import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { active, api } from "./client";

export function useSolve(id: string | null) {
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<"polling" | "live">("polling");
  const job = useQuery({
    queryKey: ["solve", id],
    queryFn: () => api.job(id!),
    enabled: !!id,
    retry: 1,
    refetchInterval: (query) =>
      active(query.state.data?.status) ? 2000 : false,
  });
  const result = useQuery({
    queryKey: ["results", id],
    queryFn: () => api.results(id!),
    enabled: !!id && job.data?.status === "completed",
    staleTime: Infinity,
  });
  const running = active(job.data?.status);
  useEffect(() => {
    if (!id || !running) return;
    const socket = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/solves/${id}`,
    );
    socket.onopen = () => setConnection("live");
    socket.onmessage = () => {
      void queryClient.invalidateQueries({ queryKey: ["solve", id] });
    };
    socket.onerror = () => setConnection("polling");
    socket.onclose = () => setConnection("polling");
    return () => {
      socket.onclose = null;
      socket.close();
    };
  }, [id, running, queryClient]);
  return { job, result, connection };
}
