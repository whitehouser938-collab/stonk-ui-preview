// API Configuration utility
export const getApiBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    console.warn(
      "VITE_API_URL environment variable is not set. Using fallback URL."
    );
    return "http://localhost:3000"; // Fallback URL
  }

  return apiUrl;
};

export const validateApiConfig = (): boolean => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    console.error("VITE_API_URL environment variable is required but not set.");
    return false;
  }

  try {
    new URL(apiUrl);
    return true;
  } catch (error) {
    console.error("VITE_API_URL is not a valid URL:", apiUrl);
    return false;
  }
};
