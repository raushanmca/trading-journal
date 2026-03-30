function normalizePnl(pnl, tradeResult) {
  const numericPnl = Number(pnl);

  if (!Number.isFinite(numericPnl)) {
    return 0;
  }

  const absolutePnl = Math.abs(numericPnl);

  if (tradeResult === "loss") {
    return -absolutePnl;
  }

  if (tradeResult === "profit") {
    return absolutePnl;
  }

  return numericPnl;
}

module.exports = {
  normalizePnl,
};
