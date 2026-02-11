# Content Security Policy (CSP) Security Notes

## Current Status

The application currently uses `unsafe-inline` and `unsafe-eval` in its CSP configuration (vercel.json:52-54). This is a known security risk that should be addressed.

## Current CSP

```
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  img-src 'self' data: https: blob:; 
  font-src 'self' https://fonts.gstatic.com data:; 
  connect-src 'self' https://api.stonkmarket.xyz wss://api.stonkmarket.xyz https://*.infura.io https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org; 
  frame-src 'none'; 
  base-uri 'self'; 
  form-action 'self';
```

## Security Risks

1. **`unsafe-inline`** - Allows inline scripts and styles, which can be exploited in XSS attacks
2. **`unsafe-eval`** - Allows use of eval() and similar functions, which can execute arbitrary code

## Why These Are Currently Needed

- **Vite/React**: Development build uses inline scripts
- **WalletConnect/Web3**: Some wallet providers use eval() or dynamic script loading
- **Styled Components/CSS-in-JS**: May inject inline styles

## Recommended Fixes (Priority Order)

### 1. Remove `unsafe-eval` (High Priority)
- Audit dependencies for eval() usage
- Check if WalletConnect SDK can work without eval()
- Consider alternative wallet connection libraries if needed
- Test in production build (Vite doesn't use eval in production)

### 2. Replace `unsafe-inline` for Scripts (High Priority)
Use nonces or hashes instead:

```html
<!-- In vercel.json, generate nonce per request -->
Content-Security-Policy: script-src 'self' 'nonce-{RANDOM_NONCE}';

<!-- In index.html -->
<script nonce="{RANDOM_NONCE}" type="module" src="/src/main.tsx"></script>
```

### 3. Replace `unsafe-inline` for Styles (Medium Priority)
Options:
- Use nonces for inline styles
- Move all styles to external stylesheets
- Configure CSS-in-JS to work with nonces

### 4. Update connect-src (Low Priority)
Replace hardcoded `https://api.stonkmarket.xyz` with environment-based URL:
```
connect-src 'self' ${process.env.VITE_API_URL} ${process.env.VITE_WEBSOCKET_URL} https://*.infura.io ...
```

## Implementation Steps

1. **Test in Production Build First**
   ```bash
   npm run build
   npm run preview
   ```
   Check browser console for CSP violations

2. **Implement Script Nonces**
   - Add nonce generation to Vercel middleware
   - Update index.html to use nonce
   - Update CSP header

3. **Audit for eval() Usage**
   ```bash
   grep -r "eval(" src/
   grep -r "new Function" src/
   ```

4. **Test with Strict CSP**
   Temporarily set very strict CSP and note all violations:
   ```
   script-src 'self'; style-src 'self';
   ```

5. **Gradual Migration**
   - Remove unsafe-eval first
   - Then tackle unsafe-inline with nonces
   - Test thoroughly with wallet connections

## Testing Checklist

- [ ] App loads correctly
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] WebSocket connections establish
- [ ] Charts render properly
- [ ] Trading functions work
- [ ] No CSP violations in console

## References

- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Vite CSP Configuration](https://vitejs.dev/guide/build.html#content-security-policy)
