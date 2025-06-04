import { apiService } from "../apiService";
import { KeyMappingUrls } from "../../enum/api/KeyMappingUrls";

// Define the connect request payload
export interface ConnectKeyMappingRequest {
  apikeyList: string[]; // Updated to match the API
  urlmapping_id: number;
}

// Inject endpoints for connecting API keys
export const keyMappingConnect = apiService.injectEndpoints({
  endpoints: (builder) => ({
    saveKeyMapping: builder.mutation<void, ConnectKeyMappingRequest>({
      query: (requestData) => ({
        url: KeyMappingUrls.Connect,
        method: "POST",
        body: requestData, // Send as request body instead of query params
        headers: {
          "Content-Type": "application/json",
        },
      }),
    }),
  }),
});

// Export hooks for use in components
export const { useSaveKeyMappingMutation } = keyMappingConnect;