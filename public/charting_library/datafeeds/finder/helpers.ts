// Makes requests to Finder API
export async function makeApiRequest(path: string) {
  try {
    const url = new URL(`${import.meta.env.VITE_API_URL}/${path}`);
    const response = await fetch(url.toString());
    return response.json();
  } catch (error: any) {
    throw new Error(`API request error: ${error.status}`);
  }
}