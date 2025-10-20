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

export function getTradeLimitForResolution(resolution: string): number {
  switch (resolution) {
    case "1": return 1500;     // fine granularity → more trades needed
    case "15": return 2000;
    case "30": return 2500;
    case "60": return 3000;
    case "180": return 4000;
    case "1D": return 5000;
    case "3D": return 7000;
    case "1W": return 10000;
    case "1M": return 12000;
    default: return 3000;
  }
}