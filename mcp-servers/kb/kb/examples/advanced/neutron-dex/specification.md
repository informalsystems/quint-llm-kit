## Specification invariants

These are the invariants as provided by the development team.

### Limit Orders

**LO.1:** When limit orders are swapped through the pro-rata portion of the swap value will returnable to all participants via withdraws

- trancheUser.SharesOwned = amountIn
- totalMakerDenom = sum(allTrancheUsers.SharesOwned)
- proRataShare = trancheUser.SharesOwned / totalMakerDenom
- percentFilled = reservesTakerDenom * price /  totalMakerDenom
- withdrawAmount = proRataShare * percentFilled * reservesTakerDenom - sharesWithdrawn

Note that withdraws can happen at any time and any number of times throughout the lifecycle of a limit order.

**LO.2:** When canceling a limit order the participants will receive their pro-rata share of any unused maker denom as well as their pro-rata share of all swap proceeds. Cancellations will not change the future withdraw or cancel outcomes for other participants.

- cancelAmountOutTokenIn = (1-percentFilled) * proRataShare * totalMakerDenom
- cancelAmountOutTokenOut = proRataShare * percentFilled * reservesTakerDenom - SharesWithdrawn

### Liquidity Pools

**LP.1:** Shares are correctly minted when depositing into a pool.

- shareValue = totalPreexistingShares / totalPoolValue
- depositValue = depositAmountToken0 + depositAmountToken1 * price
- sharesMinted = depositValue * shareValue

**LP.2:** Autoswap correctly adjusts shares minted.

- autoswapFee = residualValue0 * poolFee + residualValue1 * poolFee * price
- shareValue = totalPreexistingShares / (totalPoolValue + autswapFee)
- sharesMinted = (depositValue - autoswapFee) * shareValue

**LP.3:** Swapping through a pool can only increase the total value of the pool (assuming token price is the tick price)

- preexistingPoolValue = reserves0 + reserves1 * price
- totalPoolValue = preexistingPoolValue + swapAmountToken0 * (1 + fee) + swapAmountToken1 * (1 + fee) * price

**LP.4:** Withdrawing from a pool will yield the correct pro-rata value based on the number of shares withdrawn

- proRataShare = sharesOwned / totalShares
- withdrawAmount0 = proRataShare * poolReserves0
- withdrawAmount1 = proRataShare * poolReserves1

**LP.5:** When a single user withdraws 100% of their shares from the pool

- For each time period t when a swap occurs a user receives the correct proportion of the swap fee
- depositValue = token0 + token1 * price
- swapFee = token0In * poolFee + token1In  * poolFee * price
- poolValue = reserves0 + reserves1 * price

### Swaps

**Swap.1:** When a user swaps their limit price is honored

- amountOut ≥   amountUsed * limitPrice
- amountIn ≥ amountUsed

**Swap.2:** If MaxAmountOut is set, then amountOut ≤ maxAmountOut.

**Swap.3:** If FillOrKill, then amountIn == AmountUsed.
