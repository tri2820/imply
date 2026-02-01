import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { GdeltService } from "@/gen/gdelt/v1/gdelt_pb";

const BASE_URL = import.meta.env.SERVER_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:8080`;

const transport = createConnectTransport({
  baseUrl: BASE_URL,
  interceptors: [
    (next) => async (req) => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        req.header.set("Authorization", `Bearer ${token}`);
      }
      return next(req);
    },
  ],
});

export const gdeltClient = createClient(GdeltService, transport);
