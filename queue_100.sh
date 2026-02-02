#!/bin/bash
# Spaced Centurion Queue (15s delay to prevent batching/race conditions)
TICKERS="NFLX CVX KO GE CAT CSCO HSBC AZN GS LRCX TM IBM MS NVS WFC MRK PM RTX NVO AMAT UNH INTC AXP SAP RY MCD TMO TMUS SHEL LIN PEP TXN GEV C MUFG CRM SAN ABT VZ SCHW DIS AMGN T KLAC BA BLK NEE APH GILD ISRG BHP ANET BX SHOP UBER TJX BKNG ACN APP QCOM SPGI TD DHR SCCO HDB RIO ADI TTE PFE LOW UL"

for ticker in $TICKERS; do
  echo "Processing $ticker..."
  curl -X POST "https://research.moecapital.com/api/admin/generate?token=nerd-token-123" \
    -H "Content-Type: application/json" \
    -d "{\"symbol\":\"$ticker\"}"
  echo "- Queued $ticker (Waiting 15s for spacing...)"
  sleep 15
done
