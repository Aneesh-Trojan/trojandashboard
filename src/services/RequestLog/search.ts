import { apiService } from "../apiService";
import { RequestLogUrls } from "../../enum/api/requestLog.enum";

// Define the search request payload
interface SearchRequestLogsRequest {
  url?: string;
  httpmethod?: string;
  ipaddress?: string;
  clientname?: string;
}

// Define the request log response
export interface RequestLog {
  requestLogId: string;
  url: string;
  httpMethod: string;
  requestUrl: string | null;
  ipAddress: string;
  browser: string;
  machine: string;
  country: string;
  createdAt: string;
  apiKey: string | null;
  clientName: string;
  responseStatusCode: string;
}

// Inject endpoints for searching request logs
export const requestLogSearch = apiService.injectEndpoints({
  endpoints: (builder) => ({
    searchRequestLogs: builder.query<RequestLog[], SearchRequestLogsRequest>({
      query: (params) => ({
        url: RequestLogUrls.LogSearch,
        method: "GET",
        params,
      }),
    }),
  }),
});

// Export hooks for use in components
export const { useSearchRequestLogsQuery } = requestLogSearch;