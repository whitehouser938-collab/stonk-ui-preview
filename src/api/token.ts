const API_BASE_URL = import.meta.env.VITE_API_URL;

export const addToken = async (tokenData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/token/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenData),
    });

    if (!response.ok) {
      throw new Error("Failed to add token");
    }

    const resData = await response.json();
    if (!resData || !resData.success) {
      throw new Error("Token addition unsuccessful");
    }
    return resData.token;
  } catch (error) {
    console.error("Error adding token:", error);
    throw error;
  }
};
