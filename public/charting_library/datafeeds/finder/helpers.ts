// Makes requests to Finder API
export async function makeApiRequest(path: string) {
  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/${path}`);
    const response = await fetch(url.toString());
    return response.json();
  } catch (error: any) {
    throw new Error(`API request error: ${error.status}`);
  }
}

// Generates a symbol ID from a pair using chain:symbol:address
export function generateSymbol(symbol: string, address: string) {
  const short = `${symbol}:${address}`;
  return {
    short,
  };
}

// Returns all parts of the symbol
//  It is a chain:symbol:address
export function parseFullSymbol(fullSymbol: string) {
  const match = fullSymbol.match(/^(\w+):(\w+)\:(\w+)$/);
  if (!match) {
    return null;
  }
  return { chain: match[1], symbol: match[2], address: match[3] };
}
