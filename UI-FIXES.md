# Stonk Market UI Fixes

Reference screenshots are in the repo root (ui-fixes-*.jpg). Here are the 5 changes needed:

## 1. Search Modal — Show Search History
File: `src/components/SearchModal.tsx` + `src/services/searchHistory.ts`
- When the search modal opens and the input is empty, show recent search history
- There's already a `searchHistory.ts` service — use it to display previous searches
- Show them as clickable items below "Start typing to search tokens..."

## 2. Search Modal — Remove Blue Styling  
File: `src/components/SearchModal.tsx`
- The search input area has a blue/highlighted border or background
- Remove the blue color — make it match the dark theme (dark gray/neutral border)

## 3. Token Detail Page — Push Token Info Down + Align Buy/Sell
File: `src/pages/TokenDetail/components/TokenPage.tsx` or `TokenDetail.tsx`
- The token name card (showing "IRAN") needs to be pushed down so it's not cramped
- The buy/sell buttons (green "EXECUTE SELL" button visible) should be in the same row/place
- Make sure buy and sell buttons are side by side, not stacked

## 4. Market Page — Remove Line Breaks + Remove Trending Section
File: `src/pages/Markets.tsx` or `src/components/MarketsDashboard.tsx`
- The wallet address display (0xFa6A...93EB) has line breaks — remove them, show on one line
- Remove the "TRENDING NOW" section with the large token cards (IRAN, BTC hero cards)
- These take up too much space on mobile

## 5. Market Page — Remove Black Empty Space
File: `src/pages/Markets.tsx` or `src/components/MarketsDashboard.tsx`  
- There's excessive black/empty space above the token list near the "Launch token" button
- Tighten the spacing — reduce padding/margin so the token list is closer to the header
- Remove the empty gap between header area and token cards

## IMPORTANT
- This is a React + TypeScript + Vite + Tailwind project
- DO NOT break any existing functionality
- Keep the dark theme consistent
- Test with `npm run build` to verify no errors
- After all changes, commit with a descriptive message
