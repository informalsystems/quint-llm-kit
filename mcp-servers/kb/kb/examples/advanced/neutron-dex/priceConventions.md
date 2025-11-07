# Price Conventions

Since there were changes to price conventions, spanning documentation, specification, and the code, and we were changing the conventions mid developing the model, I am explicitly outlining them in this document.

## Vocabulary
We will be using the notion of a _sell price_.
If token `A` has sell price `p` (for its counterparty `B`), this means that one `A` is worth `p` `B`s.
In the context of selling, this means that we are ready to sell one `A` for `p` `B`s.

_Tick_ is the integer representation of the price.
A price for tick `t` is calculated as `1.0001^t`.

## DepositMsg
Users deposit their liquidity into _pools_.
Pools are stored under pool keys of the form `(pair, tick, fee)`
 - pair: a pair will always be sorted alphabetically, e.g., `(A, B)`
 - tick: integer representation of the price
 - fee: additional fee that the buyer pays

 By convention, the selling price of token `A` is `1.0001^(t + fee)`, and the selling price of token `B` is `1.0001^*(-t + fee)`. Excluding fees, these prices are exactly reversed.
 We can think of liquidity from pools as being stored under `t+fee` (for token `A`) and `-t+fee` (for token `B`).

The structure `DepositMsg` contains field `token0SellTick`: this is the tick `t` from the above explanation. The name `token0...` emphasises the convention that the tick in the key is the tick encoding the price of the first token of the pair.


 ## PlaceLimitOrderMsg
 Limit orders are used to exchange tokens, and all that is not matched and exchanged is stored in _tranches_ as liquidity.
 Tranches are stored under keys of the form
 ```
 type TrancheKey = {
        makerToken: Token,
        takerToken: Token,
        sellTick: TickIndex,
        id: TrancheIndex
    }
 ```
 - `makerToken`: the token that is offered as liquidity
 - `takerToken`: the counterparty token
 - `sellTick`: a tick `t` corresponding to the selling price of the makerToken
 - `id` : unique id

 The message `PlaceLimitOrderMsg` contains the field `sellTick`.
 This is the tick from above.

 ## SwapMsg
 Swaps are used to exchange tokens.
 Unlike tranches or pools, swaps do not provide liquidity.
 The `SwapMsg` looks like this

 ```
 type SwapMsg = {
    creator: Addr,
    tokenPair: (Token, Token),
    amount: int,
    limitPriceTick: TickIndex
    }
```

The `tokenPair` is a pair of the `tokenIn` (token that we want to swap) and `tokenOut` (token that we want to get in exchange).
The `limitPriceTick` here encodes the maximum price we are willing to pay for `tokenOut`.

## Properties of the convention

1. Iterating in order over liquidity ticks gives us liquidity going from the cheapest (to the buyer) to more expensive.
2. If we have liquidity `A` with sell price `p`, we can convert `x` `B`s into `A` by `1/p * x = x/p`.
Similarly, we can convert `y` `A`s into `B`s by `y*p`.
