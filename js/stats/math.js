"use strict";
/* Probability helpers (hypergeometric): chance to draw k of K in n cards. */
function deckN(d){ return Math.max(60, 100 - cmdrs(d).length); }
function exactly(N, K, n, k){ return k < 0 || k > K || n - k > N - K ? 0 : Math.exp(lnC(K, k) + lnC(N - K, n - k) - lnC(N, n)); }
/* Chance to have at least k successes when drawing n cards from N, with K successes in the deck (hypergeometric). */
const LF = [0];
 function lnFact(n){ for (let i = LF.length; i <= n; i++) LF[i] = LF[i - 1] + Math.log(i); return LF[n]; }
function lnC(n, k){ return k < 0 || k > n ? -Infinity : lnFact(n) - lnFact(k) - lnFact(n - k); }
function atLeast(N, K, n, k){
  if (k <= 0) return 1; if (K < k) return 0; n = Math.min(n, N);
  let p = 0; for (let i = 0; i < k; i++) p += Math.exp(lnC(K, i) + lnC(N - K, n - i) - lnC(N, n));
  return Math.max(0, Math.min(1, 1 - p));
}
